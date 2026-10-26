import type { ActivityItem, Paginated, TaskItem, TaskStats } from '@nexus/shared';
import {
  businessDate,
  EMAILS,
  insertDeal,
  seedSalesScenario,
  type SalesScenario,
  type ScenarioUser,
} from './utils/sales-scenario';
import { createTestApp, HttpClient, resetDatabase, type TestContext } from './utils/test-app';

describe('Tarefas e atividades (integração)', () => {
  let ctx: TestContext;
  let s: SalesScenario;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    s = await seedSalesScenario(ctx.prisma);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function loginAs(user: ScenarioUser): Promise<HttpClient> {
    const client = new HttpClient(ctx.app);
    await client.login(EMAILS[user]);
    return client;
  }

  async function createTask(client: HttpClient, data: Record<string, unknown> = {}) {
    const response = await client.post('/tasks', {
      title: 'Enviar proposta',
      dueDate: businessDate(2),
      ...data,
    });
    if (response.status !== 201) {
      throw new Error(
        `Falha ao criar tarefa (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }
    return response.body as TaskItem;
  }

  async function createActivity(client: HttpClient, data: Record<string, unknown> = {}) {
    const response = await client.post('/activities', {
      type: 'CALL',
      subject: 'Ligação de alinhamento',
      occurredAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      customerId: s.customers.sofia,
      ...data,
    });
    if (response.status !== 201) {
      throw new Error(
        `Falha ao registrar atividade (${response.status}): ${JSON.stringify(response.body)}`,
      );
    }
    return response.body as ActivityItem;
  }

  const openDeal = (customerId: string, ownerId: string) =>
    insertDeal(ctx.prisma, s.alphaId, {
      customerId,
      ownerId,
      stageId: s.stages['Qualificação']!.id,
      pipelineId: s.stages['Qualificação']!.pipelineId,
      status: 'OPEN',
      value: 1000,
    });

  describe('tarefas', () => {
    it('o vendedor cria tarefas para si: responsável, status e prioridade padrão', async () => {
      const sofia = await loginAs('sofia');
      const task = await createTask(sofia, { description: '  ' });

      expect(task).toMatchObject({
        assignee: { id: s.ids.sofia, name: 'Sofia' },
        status: 'TODO',
        priority: 'MEDIUM',
        description: null,
        dueDate: businessDate(2),
        completedAt: null,
        createdBy: { id: s.ids.sofia },
      });
    });

    it('vendedor não atribui tarefas a outros membros (403) e nada é gravado', async () => {
      const sofia = await loginAs('sofia');
      const response = await sofia.post('/tasks', {
        title: 'Tarefa para o Bruno',
        dueDate: businessDate(1),
        assigneeId: s.ids.bruno,
      });

      expect(response.status).toBe(403);
      expect(await ctx.prisma.task.count()).toBe(0);
    });

    it('a gestão atribui tarefas; só o responsável (e a gestão) as enxerga', async () => {
      const manager = await loginAs('manager');
      const task = await createTask(manager, { assigneeId: s.ids.sofia, priority: 'HIGH' });

      const sofia = await loginAs('sofia');
      const list = (await sofia.get('/tasks').expect(200)).body as Paginated<TaskItem>;
      expect(list.data.map((item) => item.id)).toEqual([task.id]);

      const bruno = await loginAs('bruno');
      expect((await bruno.get(`/tasks/${task.id}`)).status).toBe(404);
      expect((await bruno.patch(`/tasks/${task.id}`, { status: 'DONE' })).status).toBe(404);
      expect(((await bruno.get('/tasks').expect(200)).body as Paginated<TaskItem>).meta.total).toBe(
        0,
      );
    });

    it('o responsável precisa ter vínculo ativo com a organização', async () => {
      const manager = await loginAs('manager');
      const response = await manager.post('/tasks', {
        title: 'Para alguém de fora',
        dueDate: businessDate(1),
        assigneeId: s.ids.betaAdmin,
      });
      expect(response.status).toBe(400);
      expect(response.body.fieldErrors.assigneeId).toBeDefined();
    });

    it('vincula apenas clientes e negócios visíveis; o negócio define o cliente', async () => {
      const sofia = await loginAs('sofia');

      const brunoCustomer = await sofia.post('/tasks', {
        title: 'Cliente alheio',
        dueDate: businessDate(1),
        customerId: s.customers.bruno,
      });
      expect(brunoCustomer.status).toBe(400);
      expect(brunoCustomer.body.fieldErrors.customerId).toEqual(['Cliente não encontrado.']);

      const otherOrganization = await sofia.post('/tasks', {
        title: 'Cliente de outra organização',
        dueDate: businessDate(1),
        customerId: s.customers.beta,
      });
      expect(otherOrganization.status).toBe(400);

      const dealId = await openDeal(s.customers.sofia, s.ids.sofia);
      const linked = await createTask(sofia, { dealId });
      expect(linked.customer?.id).toBe(s.customers.sofia);
      expect(linked.deal?.id).toBe(dealId);

      const brunoDeal = await openDeal(s.customers.bruno, s.ids.bruno);
      const mismatch = await sofia.post('/tasks', {
        title: 'Negócio de outro cliente',
        dueDate: businessDate(1),
        customerId: s.customers.sofia,
        dealId: brunoDeal,
      });
      expect(mismatch.status).toBe(400);
      expect(mismatch.body.fieldErrors.dealId).toBeDefined();
    });

    it('concluir registra a data de conclusão; reabrir a remove', async () => {
      const sofia = await loginAs('sofia');
      const task = await createTask(sofia);

      const done = (await sofia.patch(`/tasks/${task.id}`, { status: 'DONE' })).body as TaskItem;
      expect(done.status).toBe('DONE');
      expect(done.completedAt).not.toBeNull();

      const reopened = (await sofia.patch(`/tasks/${task.id}`, { status: 'IN_PROGRESS' }))
        .body as TaskItem;
      expect(reopened.completedAt).toBeNull();
    });

    it('a gestão edita tarefas vinculadas a clientes fora da carteira do responsável', async () => {
      const manager = await loginAs('manager');
      const task = await createTask(manager, {
        assigneeId: s.ids.sofia,
        customerId: s.customers.bruno,
      });

      // A vendedora atualiza a própria tarefa sem precisar enxergar o cliente vinculado.
      const sofia = await loginAs('sofia');
      const response = await sofia.patch(`/tasks/${task.id}`, {
        title: 'Título revisado',
        customerId: s.customers.bruno,
      });
      expect(response.status).toBe(200);
      expect((response.body as TaskItem).title).toBe('Título revisado');
    });

    it('filtra por prazo no fuso de negócio e calcula os totais', async () => {
      const sofia = await loginAs('sofia');
      const overdue = await createTask(sofia, { title: 'Atrasada', dueDate: businessDate(-2) });
      const today = await createTask(sofia, { title: 'Hoje', dueDate: businessDate(0) });
      await createTask(sofia, { title: 'Semana', dueDate: businessDate(3) });
      await createTask(sofia, { title: 'Futuro', dueDate: businessDate(20) });
      const done = await createTask(sofia, { title: 'Concluída', dueDate: businessDate(-5) });
      await sofia.patch(`/tasks/${done.id}`, { status: 'DONE' });

      const titles = async (query: string) =>
        ((await sofia.get(`/tasks?${query}`).expect(200)).body as Paginated<TaskItem>).data.map(
          (task) => task.title,
        );
      expect(await titles('due=overdue')).toEqual([overdue.title]);
      expect(await titles('due=today')).toEqual([today.title]);
      expect(await titles('due=week')).toEqual(['Hoje', 'Semana']);
      expect(await titles('status=DONE')).toEqual(['Concluída']);
      expect(await titles('status=all&search=fut')).toEqual(['Futuro']);

      const stats = (await sofia.get('/tasks/stats').expect(200)).body as TaskStats;
      expect(stats).toEqual({ open: 4, overdue: 1, dueToday: 1, completedLast7Days: 1 });
    });

    it('somente a gestão exclui tarefas', async () => {
      const sofia = await loginAs('sofia');
      const task = await createTask(sofia);
      expect((await sofia.delete(`/tasks/${task.id}`)).status).toBe(403);

      const manager = await loginAs('manager');
      expect((await manager.delete(`/tasks/${task.id}`)).status).toBe(204);
      expect(await ctx.prisma.task.count()).toBe(0);
    });

    it('tarefas de uma organização não são visíveis nem alteráveis por outra', async () => {
      const sofia = await loginAs('sofia');
      const task = await createTask(sofia);

      const beta = await loginAs('betaAdmin');
      expect((await beta.get(`/tasks/${task.id}`)).status).toBe(404);
      expect((await beta.patch(`/tasks/${task.id}`, { title: 'Invadido' })).status).toBe(404);
      expect((await beta.delete(`/tasks/${task.id}`)).status).toBe(404);
      expect(
        ((await beta.get('/tasks?status=all').expect(200)).body as Paginated<TaskItem>).data,
      ).toEqual([]);
    });
  });

  describe('atividades', () => {
    it('registra interações no cliente; exige vínculo e recusa datas futuras', async () => {
      const sofia = await loginAs('sofia');
      const activity = await createActivity(sofia, { description: 'Cliente pediu revisão.' });
      expect(activity).toMatchObject({
        type: 'CALL',
        customer: { id: s.customers.sofia },
        deal: null,
        author: { id: s.ids.sofia },
      });

      const unlinked = await sofia.post('/activities', {
        type: 'NOTE',
        subject: 'Sem vínculo',
        occurredAt: new Date().toISOString(),
      });
      expect(unlinked.status).toBe(400);
      expect(unlinked.body.fieldErrors.customerId).toBeDefined();

      const future = await sofia.post('/activities', {
        type: 'MEETING',
        subject: 'Reunião futura',
        occurredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customerId: s.customers.sofia,
      });
      expect(future.status).toBe(400);
      expect(future.body.fieldErrors.occurredAt).toBeDefined();
    });

    it('o vendedor vê o histórico dos próprios clientes, inclusive registros da gestão', async () => {
      const manager = await loginAs('manager');
      const onSofia = await createActivity(manager, { subject: 'Visita da gestora' });
      const onBruno = await createActivity(manager, {
        subject: 'Reunião com o cliente do Bruno',
        customerId: s.customers.bruno,
      });

      const sofia = await loginAs('sofia');
      const list = (await sofia.get('/activities').expect(200)).body as Paginated<ActivityItem>;
      expect(list.data.map((item) => item.id)).toEqual([onSofia.id]);
      expect((await sofia.get(`/activities/${onBruno.id}`)).status).toBe(404);

      const byCustomer = (
        await manager.get(`/activities?customerId=${s.customers.bruno}`).expect(200)
      ).body as Paginated<ActivityItem>;
      expect(byCustomer.data.map((item) => item.subject)).toEqual([onBruno.subject]);
    });

    it('somente o autor edita; a gestão modera exclusões', async () => {
      const manager = await loginAs('manager');
      const byManager = await createActivity(manager, { subject: 'Registro da gestora' });

      const sofia = await loginAs('sofia');
      expect(
        (await sofia.patch(`/activities/${byManager.id}`, { subject: 'Alterado' })).status,
      ).toBe(403);
      expect((await sofia.delete(`/activities/${byManager.id}`)).status).toBe(403);

      const own = await createActivity(sofia);
      const edited = await sofia.patch(`/activities/${own.id}`, {
        type: 'MEETING',
        subject: 'Reunião presencial',
      });
      expect(edited.status).toBe(200);
      expect((edited.body as ActivityItem).type).toBe('MEETING');

      expect((await manager.delete(`/activities/${own.id}`)).status).toBe(204);
      expect((await sofia.delete(`/activities/${byManager.id}`)).status).toBe(403);
      expect((await manager.delete(`/activities/${byManager.id}`)).status).toBe(204);
    });

    it('excluir o negócio mantém tarefas e atividades no cliente; excluir o cliente as remove', async () => {
      const sofia = await loginAs('sofia');
      const dealId = await openDeal(s.customers.sofia, s.ids.sofia);
      const activity = await createActivity(sofia, { customerId: null, dealId });
      const task = await createTask(sofia, { dealId });
      expect(activity.customer.id).toBe(s.customers.sofia);

      const manager = await loginAs('manager');
      expect((await manager.delete(`/deals/${dealId}`)).status).toBe(204);
      expect((await manager.get(`/activities/${activity.id}`).expect(200)).body).toMatchObject({
        deal: null,
        customer: { id: s.customers.sofia },
      });
      expect((await manager.get(`/tasks/${task.id}`).expect(200)).body).toMatchObject({
        deal: null,
      });

      expect((await manager.delete(`/customers/${s.customers.sofia}`)).status).toBe(204);
      expect(await ctx.prisma.activity.count()).toBe(0);
      expect(await ctx.prisma.task.count()).toBe(0);
    });

    it('não registra nem lê atividades de outra organização', async () => {
      const sofia = await loginAs('sofia');
      const activity = await createActivity(sofia);

      const beta = await loginAs('betaAdmin');
      expect((await beta.get(`/activities/${activity.id}`)).status).toBe(404);
      const crossed = await beta.post('/activities', {
        type: 'NOTE',
        subject: 'Tentativa',
        occurredAt: new Date().toISOString(),
        customerId: s.customers.sofia,
      });
      expect(crossed.status).toBe(400);
      expect(await ctx.prisma.activity.count({ where: { organizationId: s.betaId } })).toBe(0);
    });
  });
});
