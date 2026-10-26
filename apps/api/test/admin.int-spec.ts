import type {
  AcceptInvitationResponse,
  AuditLogItem,
  InvitationItem,
  InvitationPreview,
  MeResponse,
  OrganizationMemberItem,
  Paginated,
  PipelineItem,
} from '@nexus/shared';
import {
  EMAILS,
  insertDeal,
  seedSalesScenario,
  type SalesScenario,
  type ScenarioUser,
} from './utils/sales-scenario';
import { createTestApp, HttpClient, resetDatabase, type TestContext } from './utils/test-app';

describe('Administração (integração)', () => {
  let ctx: TestContext;
  let s: SalesScenario;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    ctx.mail.sent.length = 0;
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

  async function auditActions(): Promise<string[]> {
    const logs = await ctx.prisma.auditLog.findMany({
      where: { organizationId: s.alphaId },
      orderBy: { createdAt: 'asc' },
    });
    return logs.map((log) => log.action);
  }

  /** Token do último convite enviado para o e-mail (lido do e-mail, como faria a pessoa). */
  function tokenSentTo(email: string): string {
    const message = ctx.mail.lastTo(email);
    const token = message?.text.match(/token=([\w-]+)/)?.[1];
    if (!token) throw new Error(`Nenhum convite enviado para ${email}`);
    return token;
  }

  describe('membros', () => {
    it('o administrador altera perfis e suspende acessos, com registro na auditoria', async () => {
      const admin = await loginAs('admin');
      const promoted = await admin.patch(`/organizations/current/members/${s.ids.sofia}`, {
        role: 'MANAGER',
      });
      expect(promoted.status).toBe(200);
      expect((promoted.body as OrganizationMemberItem).role).toBe('MANAGER');

      const bruno = await loginAs('bruno');
      await bruno.get('/customers').expect(200);
      await admin
        .patch(`/organizations/current/members/${s.ids.bruno}`, { status: 'SUSPENDED' })
        .then((response) => expect(response.status).toBe(200));
      // A suspensão vale na requisição seguinte, mesmo com a sessão aberta.
      expect((await bruno.get('/customers')).status).toBe(403);

      await admin.patch(`/organizations/current/members/${s.ids.bruno}`, { status: 'ACTIVE' });
      await bruno.post('/auth/switch-organization', { organizationId: s.alphaId });
      await bruno.get('/customers').expect(200);

      expect(await auditActions()).toEqual([
        'member.role_changed',
        'member.suspended',
        'member.reactivated',
      ]);
    });

    it('ninguém altera o próprio vínculo; gestores e vendedores não gerenciam membros', async () => {
      const admin = await loginAs('admin');
      const self = await admin.patch(`/organizations/current/members/${s.ids.admin}`, {
        role: 'SALES',
      });
      expect(self.status).toBe(409);

      const manager = await loginAs('manager');
      const byManager = await manager.patch(`/organizations/current/members/${s.ids.sofia}`, {
        role: 'ADMIN',
      });
      expect(byManager.status).toBe(403);

      const member = await ctx.prisma.organizationMember.findFirstOrThrow({
        where: { organizationId: s.alphaId, userId: s.ids.sofia },
      });
      expect(member.role).toBe('SALES');
    });

    it('o administrador de outra organização não altera membros da Alpha', async () => {
      const beta = await loginAs('betaAdmin');
      const response = await beta.patch(`/organizations/current/members/${s.ids.sofia}`, {
        status: 'SUSPENDED',
      });
      expect(response.status).toBe(404);
    });
  });

  describe('convites', () => {
    it('convida por e-mail; a pessoa cria a conta e entra direto na organização', async () => {
      const admin = await loginAs('admin');
      const created = await admin.post('/organizations/current/invitations', {
        email: '  Nova.Pessoa@Alpha.Example ',
        role: 'SALES',
      });
      expect(created.status).toBe(201);
      expect((created.body as InvitationItem).email).toBe('nova.pessoa@alpha.example');

      const token = tokenSentTo('nova.pessoa@alpha.example');
      const guest = new HttpClient(ctx.app);
      const preview = (await guest.post('/invitations/preview', { token }))
        .body as InvitationPreview;
      expect(preview).toMatchObject({
        organizationName: 'Alpha',
        role: 'SALES',
        invitedBy: 'Admin',
        accountExists: false,
      });

      const missing = await guest.post('/invitations/accept', { token });
      expect(missing.status).toBe(400);
      expect(Object.keys(missing.body.fieldErrors)).toEqual(['name', 'password']);

      const accepted = await guest.post('/invitations/accept', {
        token,
        name: 'Nova Pessoa',
        password: 'SenhaForte123',
      });
      expect(accepted.status).toBe(200);
      expect(accepted.body as AcceptInvitationResponse).toMatchObject({
        organizationName: 'Alpha',
        accountCreated: true,
        signedIn: true,
      });

      // A sessão já começa na organização do convite, com o perfil escolhido.
      const me = (await guest.get('/auth/me').expect(200)).body as MeResponse;
      expect(me.activeOrganization).toMatchObject({ id: s.alphaId, role: 'SALES' });
      const members = (await admin.get('/organizations/current/members').expect(200))
        .body as OrganizationMemberItem[];
      expect(members.find((m) => m.email === me.user.email)?.lastLoginAt).not.toBeNull();

      const reused = await new HttpClient(ctx.app).post('/invitations/preview', { token });
      expect(reused.status).toBe(400);
      expect(reused.body.code).toBe('INVALID_INVITATION');

      const pending = (await admin.get('/organizations/current/invitations').expect(200))
        .body as InvitationItem[];
      expect(pending).toEqual([]);
      expect(await auditActions()).toEqual(['invitation.created', 'invitation.accepted']);
    });

    it('quem já tem conta apenas ganha o vínculo e entra com a própria senha', async () => {
      const admin = await loginAs('admin');
      await admin.post('/organizations/current/invitations', {
        email: EMAILS.betaAdmin,
        role: 'MANAGER',
      });
      const token = tokenSentTo(EMAILS.betaAdmin);

      const guest = new HttpClient(ctx.app);
      const preview = (await guest.post('/invitations/preview', { token }))
        .body as InvitationPreview;
      expect(preview.accountExists).toBe(true);

      const accepted = (await guest.post('/invitations/accept', { token })).body;
      expect(accepted).toMatchObject({ accountCreated: false, signedIn: false });
      expect((await guest.get('/auth/me')).status).toBe(401);

      const beta = await loginAs('betaAdmin');
      const switched = await beta.post('/auth/switch-organization', { organizationId: s.alphaId });
      expect(switched.status).toBe(200);
      expect((switched.body as MeResponse).activeOrganization?.role).toBe('MANAGER');
    });

    it('recusa convites para membros e duplicados; só o administrador convida', async () => {
      const admin = await loginAs('admin');
      expect(
        (
          await admin.post('/organizations/current/invitations', {
            email: EMAILS.sofia,
            role: 'SALES',
          })
        ).status,
      ).toBe(409);

      await admin.post('/organizations/current/invitations', {
        email: 'dupla@alpha.example',
        role: 'SALES',
      });
      const duplicate = await admin.post('/organizations/current/invitations', {
        email: 'dupla@alpha.example',
        role: 'MANAGER',
      });
      expect(duplicate.status).toBe(409);

      const manager = await loginAs('manager');
      const byManager = await manager.post('/organizations/current/invitations', {
        email: 'outra@alpha.example',
        role: 'SALES',
      });
      expect(byManager.status).toBe(403);
    });

    it('cancelar ou reenviar invalida o link anterior; convites vencidos não abrem', async () => {
      const admin = await loginAs('admin');
      const invitation = (
        await admin.post('/organizations/current/invitations', {
          email: 'link@alpha.example',
          role: 'SALES',
        })
      ).body as InvitationItem;
      const first = tokenSentTo('link@alpha.example');

      await admin
        .post(`/organizations/current/invitations/${invitation.id}/resend`)
        .then((r) => expect(r.status).toBe(200));
      const second = tokenSentTo('link@alpha.example');
      expect(second).not.toBe(first);

      const guest = new HttpClient(ctx.app);
      expect((await guest.post('/invitations/preview', { token: first })).status).toBe(400);
      expect((await guest.post('/invitations/preview', { token: second })).status).toBe(200);

      await ctx.prisma.invitation.update({
        where: { id: invitation.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      expect((await guest.post('/invitations/preview', { token: second })).status).toBe(400);

      expect(
        (await admin.delete(`/organizations/current/invitations/${invitation.id}`)).status,
      ).toBe(204);
      expect((await admin.get('/organizations/current/invitations')).body).toEqual([]);
    });
  });

  describe('funis e etapas', () => {
    const pipelineId = () => s.stages['Novo lead']!.pipelineId;

    it('o administrador adiciona, renomeia e reordena etapas; ganho e perda ficam ao final', async () => {
      const admin = await loginAs('admin');
      const added = await admin.post(`/pipelines/${pipelineId()}/stages`, {
        name: 'Demonstração',
        probability: 50,
      });
      expect(added.status).toBe(201);
      const names = (pipeline: PipelineItem) => pipeline.stages.map((stage) => stage.name);
      expect(names(added.body as PipelineItem)).toEqual([
        'Novo lead',
        'Primeiro contato',
        'Qualificação',
        'Proposta enviada',
        'Negociação',
        'Demonstração',
        'Ganho',
        'Perdido',
      ]);

      const open = (added.body as PipelineItem).stages.filter((stage) => stage.kind === 'OPEN');
      const reordered = await admin.put(`/pipelines/${pipelineId()}/stages/order`, {
        stageIds: [open[5]!.id, ...open.slice(0, 5).map((stage) => stage.id)],
      });
      expect(names(reordered.body as PipelineItem).slice(0, 2)).toEqual([
        'Demonstração',
        'Novo lead',
      ]);
      expect((reordered.body as PipelineItem).stages.map((stage) => stage.position)).toEqual([
        0, 1, 2, 3, 4, 5, 6, 7,
      ]);

      const renamed = await admin.patch(
        `/pipelines/${pipelineId()}/stages/${s.stages['Ganho']!.id}`,
        {
          name: 'Fechado — ganho',
        },
      );
      expect(renamed.status).toBe(200);
      const fixedProbability = await admin.patch(
        `/pipelines/${pipelineId()}/stages/${s.stages['Ganho']!.id}`,
        { probability: 90 },
      );
      expect(fixedProbability.status).toBe(400);

      const duplicate = await admin.post(`/pipelines/${pipelineId()}/stages`, {
        name: 'novo LEAD',
        probability: 10,
      });
      expect(duplicate.status).toBe(400);
    });

    it('ao excluir uma etapa com negócios, move-os para a etapa escolhida com histórico', async () => {
      const dealId = await insertDeal(ctx.prisma, s.alphaId, {
        customerId: s.customers.sofia,
        ownerId: s.ids.sofia,
        stageId: s.stages['Qualificação']!.id,
        pipelineId: pipelineId(),
        status: 'OPEN',
        value: 1000,
      });
      const admin = await loginAs('admin');
      const blocked = await admin.delete(
        `/pipelines/${pipelineId()}/stages/${s.stages['Qualificação']!.id}`,
      );
      expect(blocked.status).toBe(409);

      const removed = await admin.delete(
        `/pipelines/${pipelineId()}/stages/${s.stages['Qualificação']!.id}?moveTo=${s.stages['Proposta enviada']!.id}`,
      );
      expect(removed.status).toBe(200);

      const deal = await ctx.prisma.deal.findUniqueOrThrow({
        where: { id: dealId },
        include: { history: true },
      });
      expect(deal.stageId).toBe(s.stages['Proposta enviada']!.id);
      expect(deal.history.map((entry) => [entry.fromStageName, entry.toStageName])).toEqual([
        ['Qualificação', 'Proposta enviada'],
      ]);

      const closing = await admin.delete(
        `/pipelines/${pipelineId()}/stages/${s.stages['Perdido']!.id}`,
      );
      expect(closing.status).toBe(409);
    });

    it('cria funis adicionais, troca o padrão e protege funis em uso', async () => {
      const admin = await loginAs('admin');
      const created = (await admin.post('/pipelines', { name: 'Renovações' })).body as PipelineItem;
      expect(created).toMatchObject({ name: 'Renovações', isDefault: false });
      expect(created.stages).toHaveLength(7);

      await admin
        .patch(`/pipelines/${created.id}`, { isDefault: true })
        .then((r) => expect(r.status).toBe(200));
      const pipelines = (await admin.get('/pipelines').expect(200)).body as PipelineItem[];
      expect(pipelines.filter((pipeline) => pipeline.isDefault).map((p) => p.id)).toEqual([
        created.id,
      ]);

      expect((await admin.delete(`/pipelines/${created.id}`)).status).toBe(409);
      await admin.patch(`/pipelines/${pipelineId()}`, { isDefault: true });
      expect((await admin.delete(`/pipelines/${created.id}`)).status).toBe(204);
    });

    it('somente o administrador configura funis', async () => {
      const manager = await loginAs('manager');
      const response = await manager.post(`/pipelines/${pipelineId()}/stages`, {
        name: 'Etapa do gestor',
        probability: 30,
      });
      expect(response.status).toBe(403);

      const beta = await loginAs('betaAdmin');
      expect((await beta.patch(`/pipelines/${pipelineId()}`, { name: 'Invadido' })).status).toBe(
        404,
      );
    });
  });

  describe('auditoria', () => {
    it('registra exclusões e reaberturas; só o administrador consulta, por organização', async () => {
      const dealId = await insertDeal(ctx.prisma, s.alphaId, {
        customerId: s.customers.bruno,
        ownerId: s.ids.bruno,
        stageId: s.stages['Ganho']!.id,
        pipelineId: s.stages['Ganho']!.pipelineId,
        status: 'WON',
        value: 500,
      });
      const manager = await loginAs('manager');
      await manager.post(`/deals/${dealId}/move`, { stageId: s.stages['Negociação']!.id });
      await manager.delete(`/deals/${dealId}`).then((r) => expect(r.status).toBe(204));
      await manager
        .delete(`/customers/${s.customers.bruno}`)
        .then((r) => expect(r.status).toBe(204));

      const admin = await loginAs('admin');
      const logs = (await admin.get('/audit?category=records').expect(200))
        .body as Paginated<AuditLogItem>;
      expect(logs.data.map((log) => log.action)).toEqual([
        'customer.deleted',
        'deal.deleted',
        'deal.reopened',
      ]);
      expect(logs.data[0]).toMatchObject({
        actor: { id: s.ids.manager, name: 'Gestora' },
        summary: expect.stringContaining('Cliente do Bruno'),
      });

      expect((await manager.get('/audit')).status).toBe(403);
      const beta = await loginAs('betaAdmin');
      expect(
        ((await beta.get('/audit').expect(200)).body as Paginated<AuditLogItem>).meta.total,
      ).toBe(0);
    });

    it('a trilha é somente de inclusão: o banco recusa alterações', async () => {
      const admin = await loginAs('admin');
      await admin.patch('/organizations/current', { name: 'Alpha Renomeada' });
      await expect(
        ctx.prisma.auditLog.updateMany({
          where: { organizationId: s.alphaId },
          data: { summary: 'adulterado' },
        }),
      ).rejects.toThrow();
    });

    it('excluir um usuário apenas anonimiza a autoria; trocar o autor continua proibido', async () => {
      const user = await ctx.prisma.user.create({
        data: { name: 'Pessoa Removida', email: 'removida@alpha.test', passwordHash: 'x' },
      });
      const log = await ctx.prisma.auditLog.create({
        data: {
          organizationId: s.alphaId,
          actorId: user.id,
          action: 'organization.updated',
          entityType: 'organization',
          summary: 'Registro de quem será removido.',
        },
      });
      const other = await ctx.prisma.user.findUniqueOrThrow({ where: { email: EMAILS.admin } });
      await expect(
        ctx.prisma.auditLog.update({ where: { id: log.id }, data: { actorId: other.id } }),
      ).rejects.toThrow();

      await ctx.prisma.user.delete({ where: { id: user.id } });

      const kept = await ctx.prisma.auditLog.findUniqueOrThrow({ where: { id: log.id } });
      expect(kept).toMatchObject({ actorId: null, summary: 'Registro de quem será removido.' });
    });
  });
});
