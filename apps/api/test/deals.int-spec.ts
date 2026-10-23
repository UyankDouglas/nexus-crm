import type {
  DealBoard,
  DealDetail,
  DealListItem,
  MeResponse,
  Paginated,
  PipelineItem,
} from '@nexus/shared';
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
 * Cenário:
 *  - Alpha: admin, gestora, vendedora Sofia e vendedor Bruno, cada vendedor com um cliente
 *  - Beta: admin, com um cliente próprio
 */
describe('Negócios e funil de vendas (integração)', () => {
  let ctx: TestContext;
  let alphaId: string;
  let betaId: string;
  let ids: Record<'admin' | 'manager' | 'sofia' | 'bruno', string>;
  let customers: Record<'sofia' | 'bruno' | 'beta', string>;
  let stages: Record<string, string>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    alphaId = (await createOrganization(ctx.prisma, { name: 'Alpha', slug: 'alpha' })).id;
    betaId = (await createOrganization(ctx.prisma, { name: 'Beta', slug: 'beta' })).id;

    const users = {
      admin: await createUser(ctx.prisma, { name: 'Admin', email: 'admin@alpha.example' }),
      manager: await createUser(ctx.prisma, { name: 'Gestora', email: 'gestora@alpha.example' }),
      sofia: await createUser(ctx.prisma, { name: 'Sofia', email: 'sofia@alpha.example' }),
      bruno: await createUser(ctx.prisma, { name: 'Bruno', email: 'bruno@alpha.example' }),
    };
    const betaAdmin = await createUser(ctx.prisma, { name: 'Beta', email: 'admin@beta.example' });
    ids = {
      admin: users.admin.id,
      manager: users.manager.id,
      sofia: users.sofia.id,
      bruno: users.bruno.id,
    };
    await addMember(ctx.prisma, alphaId, ids.admin, 'ADMIN');
    await addMember(ctx.prisma, alphaId, ids.manager, 'MANAGER');
    await addMember(ctx.prisma, alphaId, ids.sofia, 'SALES');
    await addMember(ctx.prisma, alphaId, ids.bruno, 'SALES');
    await addMember(ctx.prisma, betaId, betaAdmin.id, 'ADMIN');

    const customer = (organizationId: string, name: string, ownerId: string | null) =>
      ctx.prisma.customer
        .create({ data: { organizationId, type: 'COMPANY', name, ownerId }, select: { id: true } })
        .then((created) => created.id);
    customers = {
      sofia: await customer(alphaId, 'Cliente da Sofia', ids.sofia),
      bruno: await customer(alphaId, 'Cliente do Bruno', ids.bruno),
      beta: await customer(betaId, 'Cliente Beta', null),
    };

    const alphaStages = await ctx.prisma.pipelineStage.findMany({
      where: { organizationId: alphaId },
      select: { id: true, name: true },
    });
    stages = Object.fromEntries(alphaStages.map((stage) => [stage.name, stage.id]));
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function loginAs(email: string): Promise<HttpClient> {
    const client = new HttpClient(ctx.app);
    await client.login(email);
    return client;
  }

  async function createDeal(
    client: HttpClient,
    data: Partial<{ title: string; customerId: string; value: number; ownerId: string }> = {},
  ): Promise<DealDetail> {
    const response = await client.post('/deals', {
      title: data.title ?? 'Projeto',
      customerId: data.customerId ?? customers.sofia,
      value: data.value ?? 1000,
      ...(data.ownerId ? { ownerId: data.ownerId } : {}),
    });
    if (response.status !== 201) {
      throw new Error(
        `Falha ao criar negócio (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }
    return response.body as DealDetail;
  }

  const alphaPipelineId = () =>
    ctx.prisma.pipeline.findFirstOrThrow({ where: { organizationId: alphaId } }).then((p) => p.id);

  describe('funil padrão', () => {
    it('toda organização nova nasce com o funil de 7 etapas', async () => {
      const client = new HttpClient(ctx.app);
      const register = await client.post('/auth/register', {
        organizationName: 'Gama Ltda',
        name: 'Gabriela',
        email: 'gabriela@gama.example',
        password: 'SenhaForte123',
      });
      expect((register.body as MeResponse).activeOrganization?.name).toBe('Gama Ltda');

      const response = await client.get('/pipelines').expect(200);
      const [pipeline] = response.body as PipelineItem[];
      expect(response.body).toHaveLength(1);
      expect(pipeline!.isDefault).toBe(true);
      expect(pipeline!.stages.map((stage) => `${stage.name}:${stage.kind}`)).toEqual([
        'Novo lead:OPEN',
        'Primeiro contato:OPEN',
        'Qualificação:OPEN',
        'Proposta enviada:OPEN',
        'Negociação:OPEN',
        'Ganho:WON',
        'Perdido:LOST',
      ]);
    });
  });

  describe('cadastro', () => {
    it('vendedora cria negócio para cliente da própria carteira', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const response = await sofia.post('/deals', {
        title: '  Implantação  ',
        customerId: customers.sofia,
        value: 12500.5,
        expectedCloseDate: '2026-12-15',
      });

      expect(response.status).toBe(201);
      expect(response.body as DealDetail).toMatchObject({
        title: 'Implantação',
        value: 12500.5,
        status: 'OPEN',
        stageName: 'Novo lead',
        expectedCloseDate: '2026-12-15',
        owner: { id: ids.sofia },
        customer: { id: customers.sofia, name: 'Cliente da Sofia' },
      });
      expect(response.body.history).toHaveLength(1);
      expect(response.body.history[0]).toMatchObject({
        fromStageName: null,
        toStageName: 'Novo lead',
        toStatus: 'OPEN',
      });
    });

    it('rejeita cliente fora da carteira ou de outra organização', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      for (const customerId of [customers.bruno, customers.beta]) {
        const response = await sofia.post('/deals', { title: 'X1', customerId, value: 10 });
        expect(response.status).toBe(400);
        expect(response.body.fieldErrors.customerId).toEqual(['Cliente não encontrado.']);
      }
      expect(await ctx.prisma.deal.count()).toBe(0);
    });

    it('aceita somente etapa em andamento do próprio funil', async () => {
      const admin = await loginAs('admin@alpha.example');
      const betaStage = await ctx.prisma.pipelineStage.findFirstOrThrow({
        where: { organizationId: betaId, kind: 'OPEN' },
      });

      for (const stageId of [betaStage.id, stages.Ganho!]) {
        const response = await admin.post('/deals', {
          title: 'Projeto',
          customerId: customers.sofia,
          value: 10,
          stageId,
        });
        expect(response.status).toBe(400);
        expect(response.body.fieldErrors.stageId).toBeDefined();
      }

      const ok = await admin.post('/deals', {
        title: 'Projeto',
        customerId: customers.sofia,
        value: 10,
        stageId: stages.Qualificação,
      });
      expect(ok.body.stageName).toBe('Qualificação');
    });

    it('valida valor e data', async () => {
      const admin = await loginAs('admin@alpha.example');
      const response = await admin.post('/deals', {
        title: 'Projeto',
        customerId: customers.sofia,
        value: -5,
        expectedCloseDate: '2026-02-30',
      });
      expect(response.status).toBe(400);
      expect(response.body.fieldErrors).toMatchObject({
        value: ['O valor não pode ser negativo.'],
        expectedCloseDate: ['Informe uma data válida.'],
      });
    });

    it('vendedora não distribui negócios; gestora sim', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const denied = await sofia.post('/deals', {
        title: 'Projeto',
        customerId: customers.sofia,
        value: 10,
        ownerId: ids.bruno,
      });
      expect(denied.status).toBe(403);

      const manager = await loginAs('gestora@alpha.example');
      const deal = await createDeal(manager, { customerId: customers.bruno, ownerId: ids.bruno });
      expect(deal.owner?.id).toBe(ids.bruno);
    });
  });

  describe('visibilidade e isolamento', () => {
    it('quadro mostra a carteira de cada perfil e nada de outra organização', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const bruno = await loginAs('bruno@alpha.example');
      const manager = await loginAs('gestora@alpha.example');
      await createDeal(sofia, { title: 'Da Sofia', value: 100 });
      await createDeal(bruno, { title: 'Do Bruno', customerId: customers.bruno, value: 250 });
      const pipelineId = await alphaPipelineId();

      const titles = async (client: HttpClient) => {
        const board = (await client.get(`/pipelines/${pipelineId}/board`).expect(200))
          .body as DealBoard;
        return board.columns.flatMap((column) => column.deals.map((deal) => deal.title));
      };

      expect(await titles(sofia)).toEqual(['Da Sofia']);
      expect((await titles(manager)).sort()).toEqual(['Da Sofia', 'Do Bruno']);

      const board = (await manager.get(`/pipelines/${pipelineId}/board`)).body as DealBoard;
      expect(board.columns[0]).toMatchObject({ count: 2, totalValue: 350 });

      const beta = await loginAs('admin@beta.example');
      await beta.get(`/pipelines/${pipelineId}/board`).expect(404);
    });

    it('negócio de outro vendedor responde 404; exclusão é exclusiva da gestão', async () => {
      const bruno = await loginAs('bruno@alpha.example');
      const deal = await createDeal(bruno, { customerId: customers.bruno });
      const sofia = await loginAs('sofia@alpha.example');

      await sofia.get(`/deals/${deal.id}`).expect(404);
      expect((await sofia.patch(`/deals/${deal.id}`, { title: 'Hack' })).status).toBe(404);
      expect(
        (await sofia.post(`/deals/${deal.id}/move`, { stageId: stages.Negociação })).status,
      ).toBe(404);

      const csrf = await bruno.csrf();
      expect(
        (await bruno.agent.delete(`/api/deals/${deal.id}`).set('X-CSRF-Token', csrf)).status,
      ).toBe(403);

      const beta = await loginAs('admin@beta.example');
      await beta.get(`/deals/${deal.id}`).expect(404);
      expect((await beta.post(`/deals/${deal.id}/move`, { stageId: stages.Ganho })).status).toBe(
        404,
      );
    });
  });

  describe('movimentação', () => {
    it('registra histórico, exige motivo da perda e encerra o negócio', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const deal = await createDeal(sofia);

      const moved = await sofia.post(`/deals/${deal.id}/move`, {
        stageId: stages['Proposta enviada'],
      });
      expect(moved.status).toBe(200);
      expect(moved.body).toMatchObject({ stageName: 'Proposta enviada', status: 'OPEN' });
      expect(moved.body.history[0]).toMatchObject({
        fromStageName: 'Novo lead',
        toStageName: 'Proposta enviada',
        changedBy: { id: ids.sofia },
      });

      const noReason = await sofia.post(`/deals/${deal.id}/move`, { stageId: stages.Perdido });
      expect(noReason.status).toBe(400);
      expect(noReason.body.fieldErrors.lostReason).toEqual(['Informe o motivo da perda.']);

      const lost = await sofia.post(`/deals/${deal.id}/move`, {
        stageId: stages.Perdido,
        lostReason: 'Escolheu um concorrente',
      });
      expect(lost.body).toMatchObject({ status: 'LOST', lostReason: 'Escolheu um concorrente' });
      expect(lost.body.closedAt).not.toBeNull();
      expect(lost.body.history).toHaveLength(3);
    });

    it('somente a gestão reabre negócios encerrados; encerrados não podem ser editados', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const manager = await loginAs('gestora@alpha.example');
      const deal = await createDeal(sofia);

      const won = await sofia.post(`/deals/${deal.id}/move`, { stageId: stages.Ganho });
      expect(won.body).toMatchObject({ status: 'WON', lostReason: null });

      const edit = await sofia.patch(`/deals/${deal.id}`, { value: 999999 });
      expect(edit.status).toBe(409);

      const reopenBySales = await sofia.post(`/deals/${deal.id}/move`, {
        stageId: stages.Negociação,
      });
      expect(reopenBySales.status).toBe(403);

      const reopened = await manager.post(`/deals/${deal.id}/move`, { stageId: stages.Negociação });
      expect(reopened.body).toMatchObject({ status: 'OPEN', closedAt: null });
      expect(reopened.body.history[0]).toMatchObject({
        fromStatus: 'WON',
        toStatus: 'OPEN',
        changedBy: { id: ids.manager },
      });

      await sofia.patch(`/deals/${deal.id}`, { value: 2000 }).then((response) => {
        expect(response.status).toBe(200);
        expect(response.body.value).toBe(2000);
      });
    });

    it('não move para etapa de outro funil', async () => {
      const admin = await loginAs('admin@alpha.example');
      const deal = await createDeal(admin);
      const other = await ctx.prisma.pipeline.create({
        data: { organizationId: alphaId, name: 'Pós-venda' },
      });
      const onboarding = await ctx.prisma.pipelineStage.create({
        data: { organizationId: alphaId, pipelineId: other.id, name: 'Onboarding', position: 0 },
      });

      const response = await admin.post(`/deals/${deal.id}/move`, { stageId: onboarding.id });
      expect(response.status).toBe(400);
      expect(response.body.fieldErrors.stageId).toEqual(['Etapa não encontrada neste funil.']);
    });

    it('ordena os cards pela posição escolhida no arrastar e soltar', async () => {
      const admin = await loginAs('admin@alpha.example');
      const a = await createDeal(admin, { title: 'Card A' });
      const b = await createDeal(admin, { title: 'Card B' });
      const c = await createDeal(admin, { title: 'Card C' });
      const pipelineId = await alphaPipelineId();
      const order = async () =>
        (
          (await admin.get(`/pipelines/${pipelineId}/board`)).body as DealBoard
        ).columns[0]!.deals.map((deal) => deal.title);

      expect(await order()).toEqual(['Card C', 'Card B', 'Card A']); // novos entram no topo

      await admin.post(`/deals/${a.id}/move`, { stageId: stages['Novo lead'], afterDealId: c.id });
      expect(await order()).toEqual(['Card C', 'Card A', 'Card B']);

      await admin.post(`/deals/${b.id}/move`, { stageId: stages['Novo lead'], afterDealId: null });
      expect(await order()).toEqual(['Card B', 'Card C', 'Card A']);

      const elsewhere = await createDeal(admin, { title: 'Card D' });
      await admin.post(`/deals/${elsewhere.id}/move`, { stageId: stages.Qualificação });
      const invalid = await admin.post(`/deals/${a.id}/move`, {
        stageId: stages['Novo lead'],
        afterDealId: elsewhere.id,
      });
      expect(invalid.status).toBe(400);

      const reorderHistory = await ctx.prisma.dealStageHistory.count({ where: { dealId: a.id } });
      expect(reorderHistory).toBe(1); // reordenar na mesma etapa não gera histórico
    });
  });

  describe('listagem, quadro e indicadores', () => {
    it('quadro omite encerrados antigos, que seguem disponíveis na listagem', async () => {
      const admin = await loginAs('admin@alpha.example');
      const recent = await createDeal(admin, { title: 'Ganho recente', value: 300 });
      const old = await createDeal(admin, { title: 'Ganho antigo', value: 700 });
      await admin.post(`/deals/${recent.id}/move`, { stageId: stages.Ganho });
      await admin.post(`/deals/${old.id}/move`, { stageId: stages.Ganho });
      await ctx.prisma.deal.update({
        where: { id: old.id },
        data: { closedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) },
      });

      const pipelineId = await alphaPipelineId();
      const board = (await admin.get(`/pipelines/${pipelineId}/board`)).body as DealBoard;
      const wonColumn = board.columns.find((column) => column.stage.kind === 'WON')!;
      expect(wonColumn.deals.map((deal) => deal.title)).toEqual(['Ganho recente']);

      const list = (await admin.get('/deals?status=WON&sort=value'))
        .body as Paginated<DealListItem>;
      expect(list.data.map((deal) => deal.title)).toEqual(['Ganho antigo', 'Ganho recente']);
    });

    it('calcula indicadores respeitando a carteira', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const bruno = await loginAs('bruno@alpha.example');
      const manager = await loginAs('gestora@alpha.example');

      await createDeal(sofia, { value: 1000 });
      const won = await createDeal(sofia, { value: 3000 });
      const lost = await createDeal(sofia, { value: 500 });
      await createDeal(bruno, { customerId: customers.bruno, value: 9000 });
      await sofia.post(`/deals/${won.id}/move`, { stageId: stages.Ganho });
      await sofia.post(`/deals/${lost.id}/move`, {
        stageId: stages.Perdido,
        lostReason: 'Sem orçamento',
      });

      expect((await sofia.get('/deals/stats').expect(200)).body).toEqual({
        open: { count: 1, value: 1000 },
        won: { count: 1, value: 3000 },
        lost: { count: 1 },
        conversionRate: 0.5,
      });
      expect((await manager.get('/deals/stats')).body.open).toEqual({ count: 2, value: 10000 });
    });

    it('filtra a listagem por cliente e busca por nome', async () => {
      const admin = await loginAs('admin@alpha.example');
      await createDeal(admin, { title: 'Licenças', customerId: customers.sofia });
      await createDeal(admin, { title: 'Consultoria', customerId: customers.bruno });

      const byCustomer = (await admin.get(`/deals?customerId=${customers.bruno}`)).body;
      expect(byCustomer.data.map((deal: DealListItem) => deal.title)).toEqual(['Consultoria']);

      const bySearch = (await admin.get('/deals?search=cliente%20da%20sofia')).body;
      expect(bySearch.data.map((deal: DealListItem) => deal.title)).toEqual(['Licenças']);
    });
  });

  it('não exclui cliente que possui negócios', async () => {
    const manager = await loginAs('gestora@alpha.example');
    await createDeal(manager, { customerId: customers.sofia });

    const response = await manager.agent
      .delete(`/api/customers/${customers.sofia}`)
      .set('X-CSRF-Token', await manager.csrf());
    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/1 negócio/);
  });
});
