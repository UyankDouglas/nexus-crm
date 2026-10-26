import type { ClosedDealItem, Paginated, ReportsOverview } from '@nexus/shared';
import type { Response } from 'supertest';
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

/** Lê o corpo binário de downloads (o supertest só converte JSON e texto por padrão). */
function binary(response: Response, callback: (error: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
}

/**
 * Alpha: Sofia ganhou R$ 1.000 e perdeu R$ 800 (preço); Bruno ganhou R$ 3.000 e tem R$ 2.000
 * em "Proposta enviada" (60%). Beta tem um ganho de R$ 99.999 que nunca aparece para a Alpha.
 */
describe('Relatórios (integração)', () => {
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
    const sofia = { customerId: s.customers.sofia, ownerId: s.ids.sofia };
    const bruno = { customerId: s.customers.bruno, ownerId: s.ids.bruno };
    await insertDeal(ctx.prisma, s.alphaId, { ...sofia, ...at('Ganho'), status: 'WON', value: 1000, closedAt: daysAgo(4) });
    await insertDeal(ctx.prisma, s.alphaId, { ...sofia, ...at('Perdido'), status: 'LOST', value: 800, closedAt: daysAgo(2) });
    await insertDeal(ctx.prisma, s.alphaId, { ...bruno, ...at('Ganho'), status: 'WON', value: 3000, closedAt: daysAgo(6) });
    await insertDeal(ctx.prisma, s.alphaId, { ...bruno, ...at('Proposta enviada'), status: 'OPEN', value: 2000 });

    const betaWon = await ctx.prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: s.betaId, kind: 'WON' },
    });
    await insertDeal(ctx.prisma, s.betaId, {
      customerId: s.customers.beta,
      ownerId: s.ids.betaAdmin,
      stageId: betaWon.id,
      pipelineId: betaWon.pipelineId,
      status: 'WON',
      value: 99999,
      closedAt: daysAgo(1),
    });
  }); // prettier-ignore

  afterAll(async () => {
    await ctx.app.close();
  });

  async function loginAs(user: ScenarioUser): Promise<HttpClient> {
    const client = new HttpClient(ctx.app);
    await client.login(EMAILS[user]);
    return client;
  }

  const period = () => `from=${businessDate(-29)}&to=${businessToday()}`;

  it('consolida resultados, pipeline ponderado e motivos de perda da organização', async () => {
    const manager = await loginAs('manager');
    const report = (await manager.get(`/reports/overview?${period()}`).expect(200))
      .body as ReportsOverview;

    expect(report.totals).toEqual({
      wonCount: 2,
      wonValue: 4000,
      lostCount: 1,
      lostValue: 800,
      conversionRate: 2 / 3,
      averageTicket: 2000,
      openCount: 1,
      openValue: 2000,
      weightedValue: 1200,
    });
    expect(report.lossReasons).toEqual([
      { reason: 'Escolheu um concorrente', count: 1, value: 800 },
    ]);
    const proposal = report.pipeline.find((stage) => stage.name === 'Proposta enviada');
    expect(proposal).toMatchObject({ count: 1, value: 2000, weightedValue: 1200, probability: 60 });

    const bruno = report.sellers.find((row) => row.user?.id === s.ids.bruno);
    expect(bruno).toMatchObject({ wonValue: 3000, averageTicket: 3000, openValue: 2000 });
    // A gestora aparece mesmo sem negócios (relatório da equipe comercial).
    expect(report.sellers.map((row) => row.user?.name)).toContain('Gestora');
  });

  it('conta atividades registradas e tarefas concluídas no período por pessoa', async () => {
    await ctx.prisma.activity.create({
      data: {
        organizationId: s.alphaId,
        type: 'CALL',
        subject: 'Ligação',
        occurredAt: daysAgo(1),
        customerId: s.customers.sofia,
        authorId: s.ids.sofia,
      },
    });
    await ctx.prisma.task.create({
      data: {
        organizationId: s.alphaId,
        title: 'Concluída',
        assigneeId: s.ids.sofia,
        dueDate: new Date(`${businessDate(-1)}T00:00:00.000Z`),
        status: 'DONE',
        completedAt: daysAgo(1),
      },
    });

    const admin = await loginAs('admin');
    const report = (await admin.get(`/reports/overview?${period()}`).expect(200))
      .body as ReportsOverview;
    const sofia = report.sellers.find((row) => row.user?.id === s.ids.sofia);
    expect(sofia).toMatchObject({ activities: 1, tasksCompleted: 1, conversionRate: 0.5 });
  });

  it('lista os negócios encerrados, com filtro de resultado', async () => {
    const manager = await loginAs('manager');
    const all = (await manager.get(`/reports/closed-deals?${period()}`).expect(200))
      .body as Paginated<ClosedDealItem>;
    expect(all.meta.total).toBe(3);
    expect(all.data.map((deal) => deal.status)).toEqual(['LOST', 'WON', 'WON']);

    const lost = (await manager.get(`/reports/closed-deals?${period()}&status=LOST`).expect(200))
      .body as Paginated<ClosedDealItem>;
    expect(lost.data).toHaveLength(1);
    expect(lost.data[0]).toMatchObject({
      value: 800,
      lostReason: 'Escolheu um concorrente',
      owner: { name: 'Sofia' },
    });
  });

  it('exporta CSV e Excel e registra cada exportação na auditoria', async () => {
    const manager = await loginAs('manager');
    const csv = await manager.agent
      .get(`/api/reports/export?type=closed-deals&format=csv&${period()}`)
      .buffer(true)
      .parse(binary);
    expect(csv.status).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.headers['content-disposition']).toMatch(
      /attachment; filename="nexus-crm-closed-deals-.+\.csv"/,
    );
    const text = (csv.body as Buffer).toString('utf8');
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.split('\r\n')[0]).toBe(
      '﻿Fechamento;Negócio;Cliente;Responsável;Resultado;Valor (R$);Motivo da perda',
    );
    expect(text).toContain(';Perdido;800,00;Escolheu um concorrente');
    expect(text).not.toContain('99999');

    const xlsx = await manager.agent
      .get(`/api/reports/export?type=sellers&format=xlsx&${period()}`)
      .buffer(true)
      .parse(binary);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers['content-type']).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect((xlsx.body as Buffer).subarray(0, 2).toString()).toBe('PK');

    const exports = await ctx.prisma.auditLog.findMany({
      where: { organizationId: s.alphaId, action: 'report.exported' },
      orderBy: { createdAt: 'asc' },
    });
    expect(exports.map((log) => log.metadata)).toEqual([
      expect.objectContaining({ type: 'closed-deals', format: 'csv', rows: 3 }),
      expect.objectContaining({ type: 'sellers', format: 'xlsx' }),
    ]);
    expect(exports[0]!.summary).toMatch(
      /^Relatório "Negócios ganhos e perdidos" exportado em CSV \(\d{2}\/\d{2}\/\d{4} a \d{2}\/\d{2}\/\d{4}, 3 linhas\)\.$/,
    );
  });

  it('vendedores não acessam relatórios; períodos inválidos são recusados', async () => {
    const sofia = await loginAs('sofia');
    expect((await sofia.get(`/reports/overview?${period()}`)).status).toBe(403);
    expect((await sofia.get(`/reports/export?type=sellers&format=csv&${period()}`)).status).toBe(
      403,
    );

    const manager = await loginAs('manager');
    expect((await manager.get('/reports/overview?from=2026-10-10&to=2026-10-01')).status).toBe(400);
    expect((await manager.get(`/reports/export?type=planilha&format=pdf&${period()}`)).status).toBe(
      400,
    );
  });
});
