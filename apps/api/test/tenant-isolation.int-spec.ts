import { EMAILS, insertDeal, seedSalesScenario, type SalesScenario } from './utils/sales-scenario';
import { createTestApp, HttpClient, resetDatabase, type TestContext } from './utils/test-app';

/**
 * Varredura de isolamento multi-tenant: com uma sessão de administrador da Alpha (todas as
 * permissões), cada rota que recebe um ID é chamada com registros da Beta. Toda tentativa
 * deve responder como "não encontrado" (ou referência inválida) — sem revelar que o registro
 * existe — e nenhum dado da Beta pode mudar.
 */
describe('Isolamento entre organizações (integração)', () => {
  let ctx: TestContext;
  let s: SalesScenario;
  let alpha: HttpClient;
  let beta: Record<
    'customer' | 'contact' | 'pipeline' | 'stage' | 'deal' | 'task' | 'activity' | 'invitation',
    string
  > & { admin: string };
  let alphaDeal: string;
  let alphaContact: string;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    s = await seedSalesScenario(ctx.prisma);
    const prisma = ctx.prisma;

    const betaStage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: s.betaId, kind: 'OPEN' },
      orderBy: { position: 'asc' },
    });
    const betaDeal = await insertDeal(prisma, s.betaId, {
      customerId: s.customers.beta,
      ownerId: s.ids.betaAdmin,
      stageId: betaStage.id,
      pipelineId: betaStage.pipelineId,
      status: 'OPEN',
      value: 5000,
    });
    const contact = await prisma.contact.create({
      data: { organizationId: s.betaId, customerId: s.customers.beta, name: 'Contato Beta' },
    });
    const task = await prisma.task.create({
      data: {
        organizationId: s.betaId,
        title: 'Tarefa Beta',
        dueDate: new Date('2026-12-01'),
        assigneeId: s.ids.betaAdmin,
        customerId: s.customers.beta,
        dealId: betaDeal,
      },
    });
    const activity = await prisma.activity.create({
      data: {
        organizationId: s.betaId,
        type: 'NOTE',
        subject: 'Atividade Beta',
        occurredAt: new Date(),
        customerId: s.customers.beta,
        dealId: betaDeal,
        authorId: s.ids.betaAdmin,
      },
    });
    const invitation = await prisma.invitation.create({
      data: {
        organizationId: s.betaId,
        email: 'convidado@beta.example',
        role: 'SALES',
        tokenHash: 'b'.repeat(64),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    beta = {
      admin: s.ids.betaAdmin,
      customer: s.customers.beta,
      contact: contact.id,
      pipeline: betaStage.pipelineId,
      stage: betaStage.id,
      deal: betaDeal,
      task: task.id,
      activity: activity.id,
      invitation: invitation.id,
    };

    const alphaStage = s.stages['Novo lead']!;
    alphaDeal = await insertDeal(prisma, s.alphaId, {
      customerId: s.customers.sofia,
      ownerId: s.ids.sofia,
      stageId: alphaStage.id,
      pipelineId: alphaStage.pipelineId,
      status: 'OPEN',
      value: 1000,
    });
    alphaContact = (
      await prisma.contact.create({
        data: { organizationId: s.alphaId, customerId: s.customers.sofia, name: 'Contato Alpha' },
      })
    ).id;

    alpha = new HttpClient(ctx.app);
    await alpha.login(EMAILS.admin);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  /** Fotografia de tudo o que pertence à Beta, para comparar antes e depois da varredura. */
  async function betaSnapshot(): Promise<string> {
    const where = { organizationId: s.betaId };
    const prisma = ctx.prisma;
    const data = await Promise.all([
      prisma.organization.findUnique({ where: { id: s.betaId } }),
      prisma.organizationMember.findMany({ where, orderBy: { userId: 'asc' } }),
      prisma.customer.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.contact.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.pipeline.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.pipelineStage.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.deal.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.dealStageHistory.count({ where }),
      prisma.task.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.activity.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.invitation.findMany({ where, orderBy: { id: 'asc' } }),
      prisma.auditLog.count({ where }),
    ]);
    return JSON.stringify(data);
  }

  it('nenhuma rota por ID alcança registros de outra organização', async () => {
    const before = await betaSnapshot();
    const stage = s.stages['Qualificação']!.id;

    const attempts: Array<[string, () => Promise<{ status: number }>]> = [
      ['GET cliente', () => alpha.get(`/customers/${beta.customer}`)],
      ['PATCH cliente', () => alpha.patch(`/customers/${beta.customer}`, { name: 'Invadido' })],
      ['DELETE cliente', () => alpha.delete(`/customers/${beta.customer}`)],
      [
        'POST contato',
        () => alpha.post(`/customers/${beta.customer}/contacts`, { name: 'Nome válido' }),
      ],
      [
        'PATCH contato',
        () =>
          alpha.patch(`/customers/${beta.customer}/contacts/${beta.contact}`, {
            name: 'Nome válido',
          }),
      ],
      [
        'DELETE contato',
        () => alpha.delete(`/customers/${beta.customer}/contacts/${beta.contact}`),
      ],
      [
        'PATCH contato da Beta via cliente da Alpha',
        () =>
          alpha.patch(`/customers/${s.customers.sofia}/contacts/${beta.contact}`, {
            name: 'Nome válido',
          }),
      ],
      [
        'DELETE contato da Beta via cliente da Alpha',
        () => alpha.delete(`/customers/${s.customers.sofia}/contacts/${beta.contact}`),
      ],
      ['GET negócio', () => alpha.get(`/deals/${beta.deal}`)],
      ['PATCH negócio', () => alpha.patch(`/deals/${beta.deal}`, { title: 'Invadido' })],
      ['POST mover negócio', () => alpha.post(`/deals/${beta.deal}/move`, { stageId: stage })],
      ['DELETE negócio', () => alpha.delete(`/deals/${beta.deal}`)],
      ['GET quadro do funil', () => alpha.get(`/pipelines/${beta.pipeline}/board`)],
      ['PATCH funil', () => alpha.patch(`/pipelines/${beta.pipeline}`, { name: 'Invadido' })],
      ['DELETE funil', () => alpha.delete(`/pipelines/${beta.pipeline}`)],
      [
        'POST etapa',
        () => alpha.post(`/pipelines/${beta.pipeline}/stages`, { name: 'Nova', probability: 50 }),
      ],
      [
        'PUT ordem das etapas',
        () => alpha.put(`/pipelines/${beta.pipeline}/stages/order`, { stageIds: [beta.stage] }),
      ],
      [
        'PATCH etapa',
        () =>
          alpha.patch(`/pipelines/${beta.pipeline}/stages/${beta.stage}`, { name: 'Nome válido' }),
      ],
      ['DELETE etapa', () => alpha.delete(`/pipelines/${beta.pipeline}/stages/${beta.stage}`)],
      ['GET tarefa', () => alpha.get(`/tasks/${beta.task}`)],
      ['PATCH tarefa', () => alpha.patch(`/tasks/${beta.task}`, { status: 'DONE' })],
      ['DELETE tarefa', () => alpha.delete(`/tasks/${beta.task}`)],
      ['GET atividade', () => alpha.get(`/activities/${beta.activity}`)],
      [
        'PATCH atividade',
        () => alpha.patch(`/activities/${beta.activity}`, { subject: 'Assunto válido' }),
      ],
      ['DELETE atividade', () => alpha.delete(`/activities/${beta.activity}`)],
      [
        'POST reenviar convite',
        () => alpha.post(`/organizations/current/invitations/${beta.invitation}/resend`),
      ],
      [
        'DELETE convite',
        () => alpha.delete(`/organizations/current/invitations/${beta.invitation}`),
      ],
      [
        'PATCH membro',
        () => alpha.patch(`/organizations/current/members/${beta.admin}`, { status: 'SUSPENDED' }),
      ],
    ];

    for (const [label, attempt] of attempts) {
      const response = await attempt();
      expect({ label, status: response.status }).toEqual({ label, status: 404 });
    }
    expect(await betaSnapshot()).toBe(before);
  });

  it('referências a registros da Beta em corpos de requisição são recusadas', async () => {
    const before = await betaSnapshot();
    const alphaStage = s.stages['Novo lead']!.id;

    // [descrição, campo que deve ser recusado (null = recusa de acesso), requisição]
    const attempts: Array<
      [
        string,
        string | null,
        () => Promise<{ status: number; body: { fieldErrors?: Record<string, string[]> } }>,
      ]
    > = [
      [
        'negócio com cliente da Beta',
        'customerId',
        () =>
          alpha.post('/deals', {
            title: 'Teste de isolamento',
            customerId: beta.customer,
            value: 10,
          }),
      ],
      [
        'negócio com etapa da Beta',
        'stageId',
        () =>
          alpha.post('/deals', {
            title: 'Teste de isolamento',
            customerId: s.customers.sofia,
            stageId: beta.stage,
            value: 10,
          }),
      ],
      [
        'negócio com responsável da Beta',
        'ownerId',
        () =>
          alpha.post('/deals', {
            title: 'Teste de isolamento',
            customerId: s.customers.sofia,
            value: 10,
            ownerId: beta.admin,
          }),
      ],
      [
        'mover negócio para etapa da Beta',
        'stageId',
        () => alpha.post(`/deals/${alphaDeal}/move`, { stageId: beta.stage }),
      ],
      [
        'posicionar após negócio da Beta',
        'afterDealId',
        () =>
          alpha.post(`/deals/${alphaDeal}/move`, { stageId: alphaStage, afterDealId: beta.deal }),
      ],
      [
        'cliente vinculado a empresa da Beta',
        'companyId',
        () =>
          alpha.post('/customers', {
            type: 'PERSON',
            name: 'Pessoa Teste',
            companyId: beta.customer,
          }),
      ],
      [
        'cliente com responsável da Beta',
        'ownerId',
        () =>
          alpha.post('/customers', { type: 'COMPANY', name: 'Empresa Teste', ownerId: beta.admin }),
      ],
      [
        'tarefa com cliente da Beta',
        'customerId',
        () =>
          alpha.post('/tasks', {
            title: 'Teste de isolamento',
            dueDate: '2026-12-01',
            customerId: beta.customer,
          }),
      ],
      [
        'tarefa com negócio da Beta',
        'dealId',
        () =>
          alpha.post('/tasks', {
            title: 'Teste de isolamento',
            dueDate: '2026-12-01',
            dealId: beta.deal,
          }),
      ],
      [
        'tarefa para membro da Beta',
        'assigneeId',
        () =>
          alpha.post('/tasks', {
            title: 'Teste de isolamento',
            dueDate: '2026-12-01',
            assigneeId: beta.admin,
          }),
      ],
      [
        'atividade com cliente da Beta',
        'customerId',
        () =>
          alpha.post('/activities', {
            type: 'NOTE',
            subject: 'Assunto válido',
            occurredAt: new Date().toISOString(),
            customerId: beta.customer,
          }),
      ],
      [
        'atividade com negócio da Beta',
        'dealId',
        () =>
          alpha.post('/activities', {
            type: 'NOTE',
            subject: 'Assunto válido',
            occurredAt: new Date().toISOString(),
            customerId: s.customers.sofia,
            dealId: beta.deal,
          }),
      ],
      [
        'contato da Alpha movido para cliente da Beta',
        'customerId',
        () =>
          alpha.patch(`/customers/${s.customers.sofia}/contacts/${alphaContact}`, {
            customerId: beta.customer,
          }),
      ],
      [
        'organização ativa trocada para a Beta',
        null,
        () => alpha.post('/auth/switch-organization', { organizationId: s.betaId }),
      ],
    ];

    for (const [label, field, attempt] of attempts) {
      const response = await attempt();
      // A recusa vem do campo que aponta para a Beta, não de outro erro de validação.
      const outcome = field
        ? { status: response.status, fields: Object.keys(response.body.fieldErrors ?? {}) }
        : { status: response.status };
      expect({ label, ...outcome }).toEqual(
        field ? { label, status: 400, fields: [field] } : { label, status: 403 },
      );
    }
    expect(await betaSnapshot()).toBe(before);
  });

  it('listagens, totais e buscas nunca incluem dados da Beta', async () => {
    const lists = await Promise.all([
      alpha.get('/customers?pageSize=50'),
      alpha.get('/customers?search=Beta'),
      alpha.get('/deals?pageSize=50'),
      alpha.get('/tasks?pageSize=50'),
      alpha.get('/activities?pageSize=50'),
      alpha.get('/organizations/current/members'),
      alpha.get('/organizations/current/invitations'),
      alpha.get('/pipelines'),
      alpha.get('/audit?pageSize=50'),
    ]);
    const betaIds = Object.values(beta);
    for (const response of lists) {
      expect(response.status).toBe(200);
      const body = JSON.stringify(response.body);
      for (const id of betaIds) expect(body).not.toContain(id);
      expect(body).not.toContain('Cliente Beta');
    }

    // Parâmetros desconhecidos — como um organizationId — são recusados pela validação.
    expect((await alpha.get(`/customers?organizationId=${s.betaId}`)).status).toBe(400);
  });
});
