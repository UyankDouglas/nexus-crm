import {
  completeCnpj,
  completeCpf,
  type ContactItem,
  type CustomerDetail,
  type CustomerListItem,
  type Paginated,
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

const CNPJ_A = completeCnpj('112223330001'); // 11.222.333/0001-81
const CNPJ_ALPHANUMERIC = '12ABC34501DE35';
const CPF_A = completeCpf('529982247');
const UNKNOWN_ID = '01900000-0000-7000-8000-000000000000';

/**
 * Cenário:
 *  - Alpha: admin, gestora, vendedora Sofia e vendedor Bruno
 *  - Beta: admin (outra organização)
 */
describe('Clientes e contatos (integração)', () => {
  let ctx: TestContext;
  let alphaId: string;
  let betaId: string;
  let ids: Record<'admin' | 'manager' | 'sofia' | 'bruno' | 'betaAdmin', string>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    alphaId = (await createOrganization(ctx.prisma, { name: 'Alpha', slug: 'alpha' })).id;
    betaId = (await createOrganization(ctx.prisma, { name: 'Beta', slug: 'beta' })).id;

    const admin = await createUser(ctx.prisma, { name: 'Admin', email: 'admin@alpha.example' });
    const manager = await createUser(ctx.prisma, {
      name: 'Gestora',
      email: 'gestora@alpha.example',
    });
    const sofia = await createUser(ctx.prisma, { name: 'Sofia', email: 'sofia@alpha.example' });
    const bruno = await createUser(ctx.prisma, { name: 'Bruno', email: 'bruno@alpha.example' });
    const betaAdmin = await createUser(ctx.prisma, {
      name: 'Admin Beta',
      email: 'admin@beta.example',
    });
    ids = {
      admin: admin.id,
      manager: manager.id,
      sofia: sofia.id,
      bruno: bruno.id,
      betaAdmin: betaAdmin.id,
    };

    await addMember(ctx.prisma, alphaId, admin.id, 'ADMIN');
    await addMember(ctx.prisma, alphaId, manager.id, 'MANAGER');
    await addMember(ctx.prisma, alphaId, sofia.id, 'SALES');
    await addMember(ctx.prisma, alphaId, bruno.id, 'SALES');
    await addMember(ctx.prisma, betaId, betaAdmin.id, 'ADMIN');
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  async function loginAs(email: string): Promise<HttpClient> {
    const client = new HttpClient(ctx.app);
    await client.login(email);
    return client;
  }

  async function seedCustomer(
    data: Partial<{
      name: string;
      type: 'COMPANY' | 'PERSON';
      ownerId: string | null;
      status: 'LEAD' | 'ACTIVE' | 'INACTIVE';
      tags: string[];
      email: string;
      phone: string;
      document: string;
      companyId: string;
      organizationId: string;
    }> = {},
  ): Promise<string> {
    const customer = await ctx.prisma.customer.create({
      data: {
        organizationId: data.organizationId ?? alphaId,
        type: data.type ?? 'COMPANY',
        name: data.name ?? 'Cliente',
        ownerId: data.ownerId === undefined ? ids.sofia : data.ownerId,
        status: data.status ?? 'LEAD',
        tags: data.tags ?? [],
        email: data.email,
        phone: data.phone,
        document: data.document,
        companyId: data.companyId,
      },
      select: { id: true },
    });
    return customer.id;
  }

  describe('cadastro e validação', () => {
    it('vendedor cadastra cliente como responsável, com dados normalizados', async () => {
      const sofia = await loginAs('sofia@alpha.example');
      const response = await sofia.post('/customers', {
        type: 'COMPANY',
        name: '  Aurora Distribuidora ',
        document: '11.222.333/0001-81',
        email: 'Compras@Aurora.Example',
        phone: '(11) 98765-4321',
        state: 'sp',
        tags: ['Varejo', ' varejo ', 'Grande  conta'],
        tradeName: '',
      });

      expect(response.status).toBe(201);
      expect(response.body as CustomerDetail).toMatchObject({
        name: 'Aurora Distribuidora',
        document: CNPJ_A,
        email: 'compras@aurora.example',
        phone: '11987654321',
        state: 'SP',
        status: 'LEAD',
        tags: ['Varejo', 'Grande conta'],
        tradeName: null,
        owner: { id: ids.sofia, name: 'Sofia' },
        createdBy: { id: ids.sofia, name: 'Sofia' },
        contacts: [],
      });

      const stored = await ctx.prisma.customer.findFirstOrThrow();
      expect(stored.organizationId).toBe(alphaId);
    });

    it('aceita CNPJ alfanumérico e valida o documento conforme o tipo', async () => {
      const admin = await loginAs('admin@alpha.example');

      const alphanumeric = await admin.post('/customers', {
        type: 'COMPANY',
        name: 'Nova Empresa',
        document: '12.abc.345/01de-35',
      });
      expect(alphanumeric.status).toBe(201);
      expect(alphanumeric.body.document).toBe(CNPJ_ALPHANUMERIC);

      const cpfAsCompany = await admin.post('/customers', {
        type: 'COMPANY',
        name: 'Empresa X',
        document: '529.982.247-25',
      });
      expect(cpfAsCompany.status).toBe(400);
      expect(cpfAsCompany.body.fieldErrors.document).toEqual(['Informe um CNPJ válido.']);

      const invalidCpf = await admin.post('/customers', {
        type: 'PERSON',
        name: 'Maria',
        document: '529.982.247-24',
      });
      expect(invalidCpf.body.fieldErrors.document).toEqual(['Informe um CPF válido.']);
    });

    it('impede documento duplicado na organização, mas não entre organizações', async () => {
      const admin = await loginAs('admin@alpha.example');
      await admin.post('/customers', { type: 'PERSON', name: 'João', document: CPF_A });

      const duplicate = await admin.post('/customers', {
        type: 'PERSON',
        name: 'João 2',
        document: CPF_A,
      });
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.fieldErrors.document).toBeDefined();

      const beta = await loginAs('admin@beta.example');
      const otherOrg = await beta.post('/customers', {
        type: 'PERSON',
        name: 'João',
        document: CPF_A,
      });
      expect(otherOrg.status).toBe(201);
    });

    it('vendedor não distribui clientes: nem para outro vendedor, nem sem responsável', async () => {
      const sofia = await loginAs('sofia@alpha.example');

      const toBruno = await sofia.post('/customers', {
        type: 'COMPANY',
        name: 'Empresa',
        ownerId: ids.bruno,
      });
      expect(toBruno.status).toBe(403);

      const unassigned = await sofia.post('/customers', {
        type: 'COMPANY',
        name: 'Empresa',
        ownerId: null,
      });
      expect(unassigned.status).toBe(403);
      expect(await ctx.prisma.customer.count()).toBe(0);
    });

    it('gestora distribui para membros ativos da própria organização apenas', async () => {
      const manager = await loginAs('gestora@alpha.example');

      const toBruno = await manager.post('/customers', {
        type: 'COMPANY',
        name: 'Para Bruno',
        ownerId: ids.bruno,
      });
      expect(toBruno.status).toBe(201);
      expect(toBruno.body.owner.id).toBe(ids.bruno);

      const otherOrgUser = await manager.post('/customers', {
        type: 'COMPANY',
        name: 'Inválido',
        ownerId: ids.betaAdmin,
      });
      expect(otherOrgUser.status).toBe(400);
      expect(otherOrgUser.body.fieldErrors.ownerId).toBeDefined();

      await ctx.prisma.organizationMember.updateMany({
        where: { userId: ids.bruno },
        data: { status: 'SUSPENDED' },
      });
      const suspended = await manager.post('/customers', {
        type: 'COMPANY',
        name: 'Suspenso',
        ownerId: ids.bruno,
      });
      expect(suspended.status).toBe(400);
    });

    it('vincula pessoa física somente a empresa visível da mesma organização', async () => {
      const admin = await loginAs('admin@alpha.example');
      const company = await seedCustomer({ name: 'Empresa Alpha' });
      const person = await seedCustomer({ name: 'Pessoa', type: 'PERSON' });
      const betaCompany = await seedCustomer({ organizationId: betaId, ownerId: null });

      const linked = await admin.post('/customers', {
        type: 'PERSON',
        name: 'Carla',
        companyId: company,
      });
      expect(linked.status).toBe(201);
      expect(linked.body.company).toEqual({ id: company, name: 'Empresa Alpha' });

      for (const companyId of [betaCompany, person, UNKNOWN_ID]) {
        const response = await admin.post('/customers', {
          type: 'PERSON',
          name: 'Xavier',
          companyId,
        });
        expect(response.status).toBe(400);
        expect(response.body.fieldErrors.companyId).toEqual(['Empresa não encontrada.']);
      }

      const companyWithCompany = await admin.post('/customers', {
        type: 'COMPANY',
        name: 'Holding',
        companyId: company,
      });
      expect(companyWithCompany.status).toBe(400);

      const detail = await admin.get(`/customers/${company}`).expect(200);
      expect((detail.body as CustomerDetail).linkedPeople.map((p) => p.name)).toEqual(['Carla']);
    });

    it('não permite alterar o tipo do cliente', async () => {
      const admin = await loginAs('admin@alpha.example');
      const id = await seedCustomer();
      const response = await admin.patch(`/customers/${id}`, { type: 'PERSON' });
      expect(response.status).toBe(400);
      expect(response.body.fieldErrors.type).toEqual(['Campo não permitido.']);
    });
  });

  describe('visibilidade e isolamento', () => {
    it('vendedor vê somente a própria carteira; gestão vê todos; outra organização, nenhum', async () => {
      await seedCustomer({ name: 'Da Sofia', ownerId: ids.sofia });
      await seedCustomer({ name: 'Do Bruno', ownerId: ids.bruno });
      await seedCustomer({ name: 'Sem dono', ownerId: null });

      const names = async (email: string) => {
        const client = await loginAs(email);
        const response = await client.get('/customers').expect(200);
        return (response.body as Paginated<CustomerListItem>).data.map((c) => c.name);
      };

      expect(await names('sofia@alpha.example')).toEqual(['Da Sofia']);
      expect(await names('gestora@alpha.example')).toEqual(['Da Sofia', 'Do Bruno', 'Sem dono']);
      expect(await names('admin@beta.example')).toEqual([]);
    });

    it('vendedor recebe 404 ao acessar cliente de outro vendedor', async () => {
      const brunoCustomer = await seedCustomer({ ownerId: ids.bruno });
      const sofia = await loginAs('sofia@alpha.example');

      await sofia.get(`/customers/${brunoCustomer}`).expect(404);
      expect((await sofia.patch(`/customers/${brunoCustomer}`, { name: 'Hack' })).status).toBe(404);
      expect(
        (await sofia.post(`/customers/${brunoCustomer}/contacts`, { name: 'Contato' })).status,
      ).toBe(404);
      expect((await sofia.agent.delete(`/api/customers/${brunoCustomer}`)).status).toBe(403);

      const stored = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: brunoCustomer } });
      expect(stored.name).toBe('Cliente');
    });

    it('outra organização não lê, altera nem exclui clientes da Alpha', async () => {
      const alphaCustomer = await seedCustomer({ ownerId: null });
      const beta = await loginAs('admin@beta.example');
      const csrf = await beta.csrf();

      await beta.get(`/customers/${alphaCustomer}`).expect(404);
      expect((await beta.patch(`/customers/${alphaCustomer}`, { name: 'Invadido' })).status).toBe(
        404,
      );
      const removal = await beta.agent
        .delete(`/api/customers/${alphaCustomer}`)
        .set('X-CSRF-Token', csrf);
      expect(removal.status).toBe(404);
      expect(await ctx.prisma.customer.count({ where: { id: alphaCustomer } })).toBe(1);
    });

    it('responde 404 para IDs malformados', async () => {
      const admin = await loginAs('admin@alpha.example');
      const response = await admin.get('/customers/nao-e-um-uuid');
      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Cliente não encontrado.');
    });

    it('somente a gestão redistribui clientes; o vendedor anterior perde o acesso', async () => {
      const id = await seedCustomer({ ownerId: ids.sofia });
      const sofia = await loginAs('sofia@alpha.example');
      const bruno = await loginAs('bruno@alpha.example');
      const manager = await loginAs('gestora@alpha.example');

      expect((await sofia.patch(`/customers/${id}`, { ownerId: ids.bruno })).status).toBe(403);

      const reassigned = await manager.patch(`/customers/${id}`, { ownerId: ids.bruno });
      expect(reassigned.status).toBe(200);
      expect(reassigned.body.owner.id).toBe(ids.bruno);

      await sofia.get(`/customers/${id}`).expect(404);
      await bruno.get(`/customers/${id}`).expect(200);
    });

    it('vendedor edita os próprios clientes e pode limpar campos opcionais', async () => {
      const id = await seedCustomer({ email: 'antigo@cliente.example' });
      const sofia = await loginAs('sofia@alpha.example');

      const response = await sofia.patch(`/customers/${id}`, {
        status: 'ACTIVE',
        email: '',
        notes: 'Prefere contato pela manhã.',
      });
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ACTIVE',
        email: null,
        notes: 'Prefere contato pela manhã.',
      });
    });
  });

  describe('busca, filtros, ordenação e paginação', () => {
    beforeEach(async () => {
      for (let index = 1; index <= 23; index++) {
        await seedCustomer({
          name: `Empresa ${String(index).padStart(2, '0')}`,
          ownerId: index % 2 === 0 ? ids.bruno : ids.sofia,
        });
      }
      await seedCustomer({
        name: 'Padaria Pão Quente',
        email: 'contato@paoquente.example',
        phone: '11987650000',
        document: CNPJ_A,
        status: 'ACTIVE',
        tags: ['Varejo', 'Alimentação'],
        ownerId: null,
      });
      await seedCustomer({
        name: 'Marina Duarte',
        type: 'PERSON',
        status: 'INACTIVE',
        tags: ['Varejo'],
        ownerId: ids.sofia,
      });
    });

    it('pagina os resultados com metadados', async () => {
      const admin = await loginAs('admin@alpha.example');

      const first = await admin.get('/customers?page=1&pageSize=10').expect(200);
      expect(first.body.meta).toEqual({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
      expect(first.body.data).toHaveLength(10);

      const last = await admin.get('/customers?page=3&pageSize=10').expect(200);
      expect(last.body.data).toHaveLength(5);

      const invalid = await admin.get('/customers?pageSize=500');
      expect(invalid.status).toBe(400);
    });

    it.each([
      ['nome sem diferenciar maiúsculas', 'padaria', 'Padaria Pão Quente'],
      ['e-mail', 'paoquente', 'Padaria Pão Quente'],
      ['documento com pontuação', '11.222.333', 'Padaria Pão Quente'],
      ['telefone formatado', '(11) 98765-0000', 'Padaria Pão Quente'],
    ])('busca por %s', async (_label, search, expected) => {
      const admin = await loginAs('admin@alpha.example');
      const response = await admin
        .get(`/customers?search=${encodeURIComponent(search)}`)
        .expect(200);
      expect((response.body as Paginated<CustomerListItem>).data.map((c) => c.name)).toEqual([
        expected,
      ]);
    });

    it('combina filtros de status, tipo, tag e responsável', async () => {
      const admin = await loginAs('admin@alpha.example');
      const totalFor = async (query: string) =>
        ((await admin.get(`/customers?${query}`).expect(200)).body as Paginated<CustomerListItem>)
          .meta.total;

      expect(await totalFor('status=ACTIVE')).toBe(1);
      expect(await totalFor('type=PERSON')).toBe(1);
      expect(await totalFor('tag=Varejo')).toBe(2);
      expect(await totalFor('tag=Varejo&type=COMPANY')).toBe(1);
      expect(await totalFor('owner=none')).toBe(1);
      expect(await totalFor(`owner=${ids.bruno}`)).toBe(11);
      expect(await totalFor('owner=me')).toBe(0);
      expect((await admin.get('/customers?owner=qualquer')).status).toBe(400);
    });

    it('ordena por cadastro mais recente', async () => {
      const admin = await loginAs('admin@alpha.example');
      const response = await admin.get('/customers?sort=recent&pageSize=1').expect(200);
      expect(response.body.data[0].name).toBe('Marina Duarte');
    });

    it('tags e totais respeitam o escopo do usuário', async () => {
      const admin = await loginAs('admin@alpha.example');
      const sofia = await loginAs('sofia@alpha.example');

      expect((await admin.get('/customers/tags').expect(200)).body).toEqual([
        'Alimentação',
        'Varejo',
      ]);
      expect((await sofia.get('/customers/tags').expect(200)).body).toEqual(['Varejo']);

      expect((await admin.get('/customers/stats').expect(200)).body).toEqual({
        total: 25,
        byStatus: { LEAD: 23, ACTIVE: 1, INACTIVE: 1 },
        unassigned: 1,
      });
      expect((await sofia.get('/customers/stats').expect(200)).body).toMatchObject({
        total: 13,
        unassigned: 0,
      });
    });
  });

  describe('contatos', () => {
    it('mantém exatamente um contato principal', async () => {
      const id = await seedCustomer();
      const sofia = await loginAs('sofia@alpha.example');

      const first = await sofia.post(`/customers/${id}/contacts`, {
        name: 'Paula',
        phone: '(11) 3456-7890',
      });
      expect(first.status).toBe(201);
      expect((first.body as ContactItem).isPrimary).toBe(true);

      const second = await sofia.post(`/customers/${id}/contacts`, {
        name: 'Rui',
        isPrimary: true,
      });
      expect(second.body.isPrimary).toBe(true);

      const primaries = () =>
        ctx.prisma.contact.findMany({ where: { customerId: id, isPrimary: true } });
      expect((await primaries()).map((c) => c.name)).toEqual(['Rui']);

      await sofia.agent
        .delete(`/api/customers/${id}/contacts/${second.body.id}`)
        .set('X-CSRF-Token', await sofia.csrf())
        .expect(204);
      expect((await primaries()).map((c) => c.name)).toEqual(['Paula']);

      const detail = await sofia.get(`/customers/${id}`).expect(200);
      expect(detail.body.contactsCount).toBe(1);
    });

    it('exige que o contato pertença ao cliente da rota', async () => {
      const customerA = await seedCustomer({ name: 'A' });
      const customerB = await seedCustomer({ name: 'B' });
      const sofia = await loginAs('sofia@alpha.example');
      const contact = await sofia.post(`/customers/${customerA}/contacts`, { name: 'Paula' });

      const wrongCustomer = await sofia.patch(
        `/customers/${customerB}/contacts/${contact.body.id}`,
        { name: 'Alterado' },
      );
      expect(wrongCustomer.status).toBe(404);
      expect(wrongCustomer.body.message).toBe('Contato não encontrado.');
    });
  });

  describe('exclusão', () => {
    it('gestão exclui cliente, remove contatos e desvincula pessoas', async () => {
      const company = await seedCustomer({ name: 'Empresa' });
      const person = await seedCustomer({ name: 'Pessoa', type: 'PERSON', companyId: company });
      const manager = await loginAs('gestora@alpha.example');
      await manager.post(`/customers/${company}/contacts`, { name: 'Contato' });

      const response = await manager.agent
        .delete(`/api/customers/${company}`)
        .set('X-CSRF-Token', await manager.csrf());
      expect(response.status).toBe(204);

      expect(await ctx.prisma.customer.count({ where: { id: company } })).toBe(0);
      expect(await ctx.prisma.contact.count()).toBe(0);
      const stored = await ctx.prisma.customer.findUniqueOrThrow({ where: { id: person } });
      expect(stored.companyId).toBeNull();
    });
  });
});
