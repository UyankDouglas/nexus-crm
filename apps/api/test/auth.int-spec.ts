import type { MeResponse } from '@nexus/shared';
import request from 'supertest';
import {
  addMember,
  createOrganization,
  createTestApp,
  createUser,
  HttpClient,
  resetDatabase,
  sessionCookieFrom,
  TEST_PASSWORD,
  type TestContext,
} from './utils/test-app';

describe('Autenticação (integração)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.mail.sent.length = 0;
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function seedSingleOrgUser(email = 'ana@alpha.example') {
    const user = await createUser(ctx.prisma, { name: 'Ana Souza', email });
    const organization = await createOrganization(ctx.prisma, { name: 'Alpha', slug: 'alpha' });
    await addMember(ctx.prisma, organization.id, user.id, 'ADMIN');
    return { user, organization };
  }

  describe('cadastro inicial', () => {
    const payload = {
      organizationName: 'Horizonte Tecnologia',
      name: 'Ana Ribeiro',
      email: 'Ana.Ribeiro@Horizonte.example',
      password: 'SenhaForte123',
    };

    it('cria organização e administrador, persiste no banco e inicia a sessão', async () => {
      const client = new HttpClient(ctx.app);
      const response = await client.post('/auth/register', payload);

      expect(response.status).toBe(201);
      const me = response.body as MeResponse;
      expect(me.user.email).toBe('ana.ribeiro@horizonte.example');
      expect(me.activeOrganization).toMatchObject({
        name: 'Horizonte Tecnologia',
        slug: 'horizonte-tecnologia',
        role: 'ADMIN',
      });

      const member = await ctx.prisma.organizationMember.findFirstOrThrow({
        include: { user: true, organization: true },
      });
      expect(member.role).toBe('ADMIN');
      expect(member.user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(member.user.passwordHash).not.toContain(payload.password);

      await client.get('/auth/me').expect(200);
    });

    it('rejeita e-mail já cadastrado', async () => {
      await new HttpClient(ctx.app).post('/auth/register', payload);
      const response = await new HttpClient(ctx.app).post('/auth/register', {
        ...payload,
        organizationName: 'Outra Empresa',
      });

      expect(response.status).toBe(409);
      expect(response.body).toMatchObject({ code: 'EMAIL_IN_USE' });
    });

    it('valida os dados e rejeita campos não permitidos', async () => {
      const response = await new HttpClient(ctx.app).post('/auth/register', {
        organizationName: 'A',
        name: '',
        email: 'invalido',
        password: 'curta',
        organizationId: 'tentativa-de-injecao',
      });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('VALIDATION_FAILED');
      expect(Object.keys(response.body.fieldErrors)).toEqual(
        expect.arrayContaining(['organizationName', 'name', 'email', 'password', 'organizationId']),
      );
    });
  });

  describe('login', () => {
    it('autentica com cookie HttpOnly e ativa a única organização do usuário', async () => {
      const { organization } = await seedSingleOrgUser();
      const client = new HttpClient(ctx.app);
      const response = await client.post('/auth/login', {
        email: 'ana@alpha.example',
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(200);
      expect((response.body as MeResponse).activeOrganization?.id).toBe(organization.id);

      const cookie = sessionCookieFrom(response);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).toMatch(/Path=\//);
      expect(JSON.stringify(response.body)).not.toMatch(/token|password/i);
    });

    it('não revela se o e-mail existe: senha errada e e-mail inexistente têm a mesma resposta', async () => {
      await seedSingleOrgUser();
      const client = new HttpClient(ctx.app);

      const wrongPassword = await client.post('/auth/login', {
        email: 'ana@alpha.example',
        password: 'SenhaErrada999',
      });
      const unknownEmail = await client.post('/auth/login', {
        email: 'ninguem@alpha.example',
        password: 'SenhaErrada999',
      });

      for (const response of [wrongPassword, unknownEmail]) {
        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          code: 'INVALID_CREDENTIALS',
          message: 'E-mail ou senha incorretos.',
        });
      }
    });
  });

  describe('proteção de rotas', () => {
    it.each(['/auth/me', '/organizations/current', '/organizations/current/members'])(
      'bloqueia %s sem sessão',
      async (path) => {
        const response = await new HttpClient(ctx.app).get(path);
        expect(response.status).toBe(401);
        expect(response.body.code).toBe('UNAUTHENTICATED');
      },
    );

    it('rejeita cookie de sessão forjado', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', 'nexus_session=token-inventado');
      expect(response.status).toBe(401);
    });
  });

  describe('CSRF', () => {
    it('exige o token em requisições de escrita, inclusive no login', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ana@alpha.example', password: TEST_PASSWORD });
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('CSRF_INVALID');
    });

    it('rejeita cabeçalho que não corresponde ao cookie', async () => {
      const client = new HttpClient(ctx.app);
      await client.csrf();
      const response = await client.agent
        .post('/api/auth/login')
        .set('X-CSRF-Token', 'abc.def')
        .send({ email: 'ana@alpha.example', password: TEST_PASSWORD });
      expect(response.status).toBe(403);
    });

    it('rejeita origem não autorizada', async () => {
      const client = new HttpClient(ctx.app);
      const response = await client.agent
        .post('/api/auth/login')
        .set('Origin', 'https://site-malicioso.example')
        .set('X-CSRF-Token', await client.csrf())
        .send({ email: 'ana@alpha.example', password: TEST_PASSWORD });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Origem da requisição não autorizada.');
    });
  });

  describe('logout', () => {
    it('revoga a sessão: o mesmo cookie deixa de funcionar', async () => {
      await seedSingleOrgUser();
      const client = new HttpClient(ctx.app);
      const login = await client.post('/auth/login', {
        email: 'ana@alpha.example',
        password: TEST_PASSWORD,
      });
      const stolenCookie = sessionCookieFrom(login)!.split(';')[0]!;

      await client.post('/auth/logout').then((response) => expect(response.status).toBe(204));
      await client.get('/auth/me').expect(401);

      const replay = await request(ctx.app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', stolenCookie);
      expect(replay.status).toBe(401);

      const session = await ctx.prisma.session.findFirstOrThrow();
      expect(session.revokedAt).not.toBeNull();
    });
  });

  describe('recuperação de senha', () => {
    it('responde igual para e-mails inexistentes, sem enviar mensagem', async () => {
      const response = await new HttpClient(ctx.app).post('/auth/forgot-password', {
        email: 'ninguem@alpha.example',
      });
      expect(response.status).toBe(202);
      expect(response.body.message).toMatch(/Se o e-mail estiver cadastrado/);
      expect(ctx.mail.sent).toHaveLength(0);
    });

    it('falhas no envio do e-mail não revelam se a conta existe', async () => {
      await seedSingleOrgUser();
      ctx.mail.failing = true;
      try {
        const client = new HttpClient(ctx.app);
        const existing = await client.post('/auth/forgot-password', { email: 'ana@alpha.example' });
        const unknown = await client.post('/auth/forgot-password', {
          email: 'ninguem@alpha.example',
        });
        expect([existing.status, unknown.status]).toEqual([202, 202]);
        expect(existing.body.message).toBe(unknown.body.message);
      } finally {
        ctx.mail.failing = false;
      }
    });

    it('redefine a senha, invalida o token e encerra as sessões abertas', async () => {
      await seedSingleOrgUser();
      const loggedIn = new HttpClient(ctx.app);
      await loggedIn.login('ana@alpha.example');

      const anonymous = new HttpClient(ctx.app);
      await anonymous
        .post('/auth/forgot-password', { email: 'ana@alpha.example' })
        .then((response) => expect(response.status).toBe(202));

      const message = ctx.mail.lastTo('ana@alpha.example');
      const token = new URL(/https?:\/\/\S+/.exec(message!.text)![0]).searchParams.get('token')!;
      expect(token).toBeTruthy();

      const stored = await ctx.prisma.passwordResetToken.findFirstOrThrow();
      expect(stored.tokenHash).not.toBe(token);

      const reset = await anonymous.post('/auth/reset-password', {
        token,
        password: 'NovaSenha456',
      });
      expect(reset.status).toBe(200);

      await loggedIn.get('/auth/me').expect(401);
      await expect(new HttpClient(ctx.app).login('ana@alpha.example')).rejects.toThrow();
      await new HttpClient(ctx.app).login('ana@alpha.example', 'NovaSenha456');

      const reuse = await anonymous.post('/auth/reset-password', {
        token,
        password: 'OutraSenha789',
      });
      expect(reuse.status).toBe(400);
      expect(reuse.body.code).toBe('INVALID_RESET_TOKEN');
    });
  });
});
