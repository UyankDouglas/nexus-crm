import { periodRange, type DashboardSummary } from '@nexus/shared';
import {
  businessDate,
  businessToday,
  daysAgo,
  EMAILS,
  insertDeal,
  seedSalesScenario,
  type SalesScenario,
  type ScenarioUser,
} from './utils/sales-scenario';
import { createTestApp, HttpClient, resetDatabase, type TestContext } from './utils/test-app';

/**
 * Carteira usada nos testes (Alpha):
 *  - Sofia: ganho de R$ 1.000 (há 5 dias), perda (há 3 dias) e R$ 500 em "Proposta enviada";
 *  - Bruno: ganho de R$ 3.000 (há 10 dias), ganho antigo de R$ 7.000 (há 200 dias) e R$ 2.000
 *    em "Novo lead".
 * A Beta tem um ganho de R$ 99.999, que nunca pode aparecer para a Alpha.
 */
describe('Dashboard (integração)', () => {
  let ctx: TestContext;
  let s: SalesScenario;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    s = await seedSalesScenario(ctx.prisma);

    const at = (name: string) => ({
      stageId: s.stages[name]!.id,
      pipelineId: s.stages[name]!.pipelineId,
    });
    const alpha = (data: Parameters<typeof insertDeal>[2]) =>
      insertDeal(ctx.prisma, s.alphaId, data);
    const sofia = { customerId: s.customers.sofia, ownerId: s.ids.sofia };
    const bruno = { customerId: s.customers.bruno, ownerId: s.ids.bruno };

    await alpha({ ...sofia, ...at('Ganho'), status: 'WON', value: 1000, closedAt: daysAgo(5) });
    await alpha({ ...sofia, ...at('Perdido'), status: 'LOST', value: 800, closedAt: daysAgo(3) });
    await alpha({ ...sofia, ...at('Proposta enviada'), status: 'OPEN', value: 500 });
    await alpha({ ...bruno, ...at('Ganho'), status: 'WON', value: 3000, closedAt: daysAgo(10) });
    await alpha({
      ...bruno,
      ...at('Ganho'),
      status: 'WON',
      value: 7000,
      closedAt: daysAgo(200),
      createdAt: daysAgo(250),
    });
    await alpha({ ...bruno, ...at('Novo lead'), status: 'OPEN', value: 2000 });

    const betaStage = await ctx.prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: s.betaId, kind: 'WON' },
    });
    await insertDeal(ctx.prisma, s.betaId, {
      customerId: s.customers.beta,
      ownerId: s.ids.betaAdmin,
      stageId: betaStage.id,
      pipelineId: betaStage.pipelineId,
      status: 'WON',
      value: 99999,
      closedAt: daysAgo(1),
    });
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function summaryFor(user: ScenarioUser, query: string): Promise<DashboardSummary> {
    const client = new HttpClient(ctx.app);
    await client.login(EMAILS[user]);
    const response = await client.get(`/dashboard?${query}`);
    if (response.status !== 200) {
      throw new Error(`Dashboard falhou (${response.status}): ${JSON.stringify(response.body)}`);
    }
    return response.body as DashboardSummary;
  }

  const last30Days = () => `from=${businessDate(-29)}&to=${businessToday()}`;

  it('a gestão vê os resultados da equipe no período, sem dados de outras organizações', async () => {
    const summary = await summaryFor('manager', last30Days());

    expect(summary.period.granularity).toBe('day');
    expect(summary.customers.total).toBe(2);
    expect(summary.pipeline).toEqual({ openCount: 2, openValue: 2500 });
    expect(summary.results).toEqual({
      wonCount: 2,
      wonValue: 4000,
      lostCount: 1,
      conversionRate: 2 / 3,
    });
    expect(summary.sales).toHaveLength(30);
    expect(summary.sales.reduce((sum, bucket) => sum + bucket.wonValue, 0)).toBe(4000);
    // O ganho antigo (200 dias) foi criado fora do período e não entra na distribuição.
    expect(summary.distribution).toEqual({ open: 2, won: 2, lost: 1 });
  });

  it('mostra os negócios em andamento por etapa e o desempenho de cada vendedor', async () => {
    const summary = await summaryFor('manager', last30Days());

    const byStage = Object.fromEntries(summary.stages.map((stage) => [stage.name, stage]));
    expect(summary.stages).toHaveLength(5);
    expect(byStage['Proposta enviada']).toMatchObject({ count: 1, value: 500 });
    expect(byStage['Novo lead']).toMatchObject({ count: 1, value: 2000 });
    expect(byStage['Negociação']).toMatchObject({ count: 0, value: 0 });

    expect(summary.sellers.map((row) => row.user?.name)).toEqual(['Bruno', 'Sofia']);
    expect(summary.sellers[1]).toMatchObject({
      wonCount: 1,
      wonValue: 1000,
      lostCount: 1,
      openCount: 1,
      openValue: 500,
      conversionRate: 0.5,
    });
  });

  it('o vendedor vê somente a própria carteira', async () => {
    const summary = await summaryFor('sofia', last30Days());

    expect(summary.customers.total).toBe(1);
    expect(summary.pipeline).toEqual({ openCount: 1, openValue: 500 });
    expect(summary.results).toMatchObject({ wonCount: 1, wonValue: 1000, lostCount: 1 });
    expect(summary.sellers.map((row) => row.user?.id)).toEqual([s.ids.sofia]);
    expect(summary.stages.reduce((sum, stage) => sum + stage.count, 0)).toBe(1);
  });

  it('um período maior inclui vendas antigas e agrupa por mês', async () => {
    const range = periodRange('12m', businessToday());
    const summary = await summaryFor('admin', `from=${range.from}&to=${range.to}`);

    expect(summary.period.granularity).toBe('month');
    expect(summary.sales).toHaveLength(12);
    expect(summary.results.wonValue).toBe(11000);
  });

  it('conta tarefas pendentes e atrasadas do escopo do usuário', async () => {
    const assign = (assigneeId: string, dueDate: string) =>
      ctx.prisma.task.create({
        data: {
          organizationId: s.alphaId,
          title: 'Retornar contato',
          assigneeId,
          dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        },
      });
    await assign(s.ids.sofia, businessDate(-1));
    await assign(s.ids.bruno, businessDate(2));

    expect((await summaryFor('manager', last30Days())).tasks).toEqual({ open: 2, overdue: 1 });
    expect((await summaryFor('bruno', last30Days())).tasks).toEqual({ open: 1, overdue: 0 });
  });

  it('valida o período informado', async () => {
    const client = new HttpClient(ctx.app);
    await client.login(EMAILS.manager);

    const inverted = await client.get(`/dashboard?from=${businessToday()}&to=${businessDate(-1)}`);
    expect(inverted.status).toBe(400);
    expect((await client.get('/dashboard?from=2026-02-30&to=2026-03-01')).status).toBe(400);
    expect((await client.get('/dashboard?from=2020-01-01&to=2026-01-01')).status).toBe(400);
    expect((await client.get('/dashboard')).status).toBe(400);
  });

  it('exige autenticação', async () => {
    const anonymous = new HttpClient(ctx.app);
    expect((await anonymous.get(`/dashboard?${last30Days()}`)).status).toBe(401);
  });
});
