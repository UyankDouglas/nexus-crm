import type { MeResponse, OrganizationMemberItem } from '@nexus/shared';
import {
  addMember,
  createOrganization,
  createTestApp,
  createUser,
  HttpClient,
  resetDatabase,
  type TestContext,
} from './utils/test-app';

/**
 * Isolamento multi-tenant e RBAC. Cenário:
 *  - Alpha: admin, gestora e vendedor
 *  - Beta: admin
 *  - Marta: gestora na Alpha e vendedora na Beta (múltiplas organizações)
 */
describe('Multi-tenant e permissões (integração)', () => {
  let ctx: TestContext;
  let alphaId: string;
  let betaId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);

    alphaId = (await createOrganization(ctx.prisma, { name: 'Alpha', slug: 'alpha' })).id;
    betaId = (await createOrganization(ctx.prisma, { name: 'Beta', slug: 'beta' })).id;

    const alphaAdmin = await createUser(ctx.prisma, {
      name: 'Admin Alpha',
      email: 'admin@alpha.example',
    });
    const alphaSales = await createUser(ctx.prisma, {
      name: 'Vendedor Alpha',
      email: 'vendas@alpha.example',
    });
    const betaAdmin = await createUser(ctx.prisma, {
      name: 'Admin Beta',
      email: 'admin@beta.example',
    });
    const marta = await createUser(ctx.prisma, {
      name: 'Marta Gestora',
      email: 'marta@multi.example',
    });

    await addMember(ctx.prisma, alphaId, alphaAdmin.id, 'ADMIN');
    await addMember(ctx.prisma, alphaId, alphaSales.id, 'SALES');
    await addMember(ctx.prisma, alphaId, marta.id, 'MANAGER');
    await addMember(ctx.prisma, betaId, betaAdmin.id, 'ADMIN');
    await addMember(ctx.prisma, betaId, marta.id, 'SALES');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('RBAC', () => {
    it('vendedor não acessa endpoints administrativos', async () => {
      const sales = new HttpClient(ctx.app);
      await sales.login('vendas@alpha.example');

      const members = await sales.get('/organizations/current/members');
      expect(members.status).toBe(403);
      expect(members.body.code).toBe('FORBIDDEN');

      const update = await sales.patch('/organizations/current', { name: 'Invadida' });
      expect(update.status).toBe(403);

      const organization = await ctx.prisma.organization.findUniqueOrThrow({
        where: { id: alphaId },
      });
      expect(organization.name).toBe('Alpha');
    });

    it('vendedor ainda consulta o resumo da própria organização', async () => {
      const sales = new HttpClient(ctx.app);
      await sales.login('vendas@alpha.example');
      const response = await sales.get('/organizations/current').expect(200);
      expect(response.body).toMatchObject({ id: alphaId, memberCount: 3 });
    });

    it('administrador altera a organização e a mudança é persistida', async () => {
      const admin = new HttpClient(ctx.app);
      await admin.login('admin@alpha.example');

      const response = await admin.patch('/organizations/current', { name: '  Alpha Ltda  ' });
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Alpha Ltda');

      const [alpha, beta] = await Promise.all([
        ctx.prisma.organization.findUniqueOrThrow({ where: { id: alphaId } }),
        ctx.prisma.organization.findUniqueOrThrow({ where: { id: betaId } }),
      ]);
      expect(alpha.name).toBe('Alpha Ltda');
      expect(beta.name).toBe('Beta');
    });
  });

  describe('isolamento entre organizações', () => {
    it('lista apenas membros da organização ativa', async () => {
      const admin = new HttpClient(ctx.app);
      await admin.login('admin@alpha.example');

      const response = await admin.get('/organizations/current/members').expect(200);
      const emails = (response.body as OrganizationMemberItem[]).map((member) => member.email);
      expect(emails.sort()).toEqual(
        ['admin@alpha.example', 'marta@multi.example', 'vendas@alpha.example'].sort(),
      );
    });

    it('impede trocar para uma organização sem vínculo', async () => {
      const admin = new HttpClient(ctx.app);
      await admin.login('admin@alpha.example');

      const response = await admin.post('/auth/switch-organization', { organizationId: betaId });
      expect(response.status).toBe(403);

      const current = await admin.get('/organizations/current').expect(200);
      expect(current.body.id).toBe(alphaId);
    });

    it('não diferencia organização inexistente de organização alheia', async () => {
      const admin = new HttpClient(ctx.app);
      await admin.login('admin@alpha.example');

      const response = await admin.post('/auth/switch-organization', {
        organizationId: '01900000-0000-7000-8000-000000000000',
      });
      expect(response.status).toBe(403);

      const invalid = await admin.post('/auth/switch-organization', { organizationId: 'abc' });
      expect(invalid.status).toBe(400);
    });

    it('ignora organizationId enviado no corpo de rotas da organização atual', async () => {
      const betaAdmin = new HttpClient(ctx.app);
      await betaAdmin.login('admin@beta.example');

      const response = await betaAdmin.patch('/organizations/current', {
        name: 'Beta Nova',
        organizationId: alphaId,
      });
      expect(response.status).toBe(400);

      const alpha = await ctx.prisma.organization.findUniqueOrThrow({ where: { id: alphaId } });
      expect(alpha.name).toBe('Alpha');
    });
  });

  describe('usuário com várias organizações', () => {
    it('exige escolher a organização e aplica o perfil de cada uma', async () => {
      const marta = new HttpClient(ctx.app);
      const me = await marta.login('marta@multi.example');
      expect(me.activeOrganization).toBeNull();
      expect(me.memberships).toHaveLength(2);

      const blocked = await marta.get('/organizations/current');
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('ORGANIZATION_REQUIRED');

      const inBeta = await marta.post('/auth/switch-organization', { organizationId: betaId });
      expect((inBeta.body as MeResponse).activeOrganization?.role).toBe('SALES');
      await marta.get('/organizations/current/members').expect(403);

      const inAlpha = await marta.post('/auth/switch-organization', { organizationId: alphaId });
      expect((inAlpha.body as MeResponse).activeOrganization?.role).toBe('MANAGER');
      const members = await marta.get('/organizations/current/members').expect(200);
      expect(members.body).toHaveLength(3);
      await marta
        .patch('/organizations/current', { name: 'X' })
        .then((r) => expect(r.status).toBe(403));
    });

    it('perde o acesso imediatamente quando o vínculo é suspenso', async () => {
      const marta = new HttpClient(ctx.app);
      await marta.login('marta@multi.example');
      await marta.post('/auth/switch-organization', { organizationId: alphaId });
      await marta.get('/organizations/current').expect(200);

      await ctx.prisma.organizationMember.updateMany({
        where: { organizationId: alphaId, user: { email: 'marta@multi.example' } },
        data: { status: 'SUSPENDED' },
      });

      const response = await marta.get('/organizations/current');
      expect(response.status).toBe(403);
      expect(response.body.code).toBe('ORGANIZATION_REQUIRED');

      const retry = await marta.post('/auth/switch-organization', { organizationId: alphaId });
      expect(retry.status).toBe(403);

      const me = await marta.get('/auth/me').expect(200);
      expect((me.body as MeResponse).memberships.map((m) => m.organizationId)).toEqual([betaId]);
    });
  });
});
