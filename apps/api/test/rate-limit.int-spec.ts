import { createTestApp, HttpClient, resetDatabase, type TestContext } from './utils/test-app';

describe('Limite de requisições (integração)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp();
    await resetDatabase(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  it('bloqueia excesso de tentativas nos endpoints de autenticação', async () => {
    const client = new HttpClient(ctx.app);
    const limit = Number(process.env.RATE_LIMIT_AUTH_MAX);
    const statuses: number[] = [];

    for (let attempt = 0; attempt <= limit; attempt++) {
      const response = await client.post('/auth/forgot-password', {
        email: 'alguem@alpha.example',
      });
      statuses.push(response.status);
    }

    expect(statuses.slice(0, limit).every((status) => status === 202)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('retorna o erro padronizado em português', async () => {
    const response = await new HttpClient(ctx.app).post('/auth/forgot-password', {
      email: 'alguem@alpha.example',
    });
    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({
      code: 'RATE_LIMITED',
      message: 'Muitas tentativas. Aguarde um instante e tente novamente.',
    });
  });
});
