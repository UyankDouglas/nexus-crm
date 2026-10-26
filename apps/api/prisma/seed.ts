/**
 * SEED DE DEMONSTRAÇÃO — NEXUS CRM
 *
 * Cria organizações, usuários e vínculos FICTÍCIOS para uso exclusivamente local ou em um
 * ambiente público isolado para demonstração. Todos os e-mails usam o domínio reservado
 * `.example` (RFC 2606) e a senha vem da variável SEED_DEMO_PASSWORD — nunca do código.
 *
 * Idempotente: pode ser executada várias vezes sem duplicar registros.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { addDays, BUSINESS_TIME_ZONE, completeCnpj, completeCpf } from '@nexus/shared';
import { PrismaClient, type MemberRole } from '../src/generated/prisma/client';
import {
  HORIZONTE_CUSTOMERS,
  VERTICE_CUSTOMERS,
  type DemoCustomer,
  type DemoOwner,
} from './demo-customers';
import {
  HORIZONTE_ACTIVITIES,
  HORIZONTE_TASKS,
  VERTICE_ACTIVITIES,
  VERTICE_TASKS,
  type DemoActivity,
  type DemoTask,
} from './demo-activities';
import { HORIZONTE_DEALS, HORIZONTE_PAST_DEALS, VERTICE_DEALS, type DemoDeal } from './demo-deals';
import { zonedIsoDate, zonedStartOfDay } from '../src/common/time/zoned-date';
import { createDefaultPipeline } from '../src/modules/deals/default-pipeline';

interface DemoUser {
  key: Exclude<DemoOwner, null>;
  name: string;
  email: string;
  memberships: Array<{ organization: string; role: MemberRole }>;
}

const DEMO_ORGANIZATIONS = [
  { slug: 'horizonte-demo', name: 'Horizonte Tecnologia (Demo)' },
  { slug: 'vertice-demo', name: 'Vértice Consultoria (Demo)' },
] as const;

const DEMO_USERS: DemoUser[] = [
  {
    key: 'ana',
    name: 'Ana Ribeiro',
    email: 'ana.ribeiro@horizonte.example',
    memberships: [{ organization: 'horizonte-demo', role: 'ADMIN' }],
  },
  {
    // Participa de duas organizações: demonstra a tela de seleção de organização.
    key: 'carlos',
    name: 'Carlos Mendes',
    email: 'carlos.mendes@horizonte.example',
    memberships: [
      { organization: 'horizonte-demo', role: 'MANAGER' },
      { organization: 'vertice-demo', role: 'SALES' },
    ],
  },
  {
    key: 'juliana',
    name: 'Juliana Costa',
    email: 'juliana.costa@horizonte.example',
    memberships: [{ organization: 'horizonte-demo', role: 'SALES' }],
  },
  {
    key: 'rafael',
    name: 'Rafael Lima',
    email: 'rafael.lima@horizonte.example',
    memberships: [{ organization: 'horizonte-demo', role: 'SALES' }],
  },
  {
    key: 'beatriz',
    name: 'Beatriz Alves',
    email: 'beatriz.alves@vertice.example',
    memberships: [{ organization: 'vertice-demo', role: 'ADMIN' }],
  },
];

function assertSafeEnvironment(): string {
  if (process.env.NODE_ENV === 'production' && process.env.DEMO_MODE !== 'true') {
    throw new Error(
      'Seed de demonstração bloqueada em produção. Use DEMO_MODE=true somente em um ambiente de demonstração isolado.',
    );
  }
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Defina SEED_DEMO_PASSWORD (mínimo de 8 caracteres) no arquivo .env.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('Defina DATABASE_URL no arquivo .env.');
  }
  return password;
}

async function main(): Promise<void> {
  const password = assertSafeEnvironment();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  try {
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const organizationIds = new Map<string, string>();
    for (const organization of DEMO_ORGANIZATIONS) {
      const record = await prisma.organization.upsert({
        where: { slug: organization.slug },
        update: { name: organization.name },
        create: organization,
      });
      organizationIds.set(organization.slug, record.id);
    }

    const userIds = new Map<string, string>();
    for (const demoUser of DEMO_USERS) {
      const user = await prisma.user.upsert({
        where: { email: demoUser.email },
        update: { name: demoUser.name, passwordHash },
        create: { name: demoUser.name, email: demoUser.email, passwordHash },
      });
      userIds.set(demoUser.key, user.id);

      for (const membership of demoUser.memberships) {
        const organizationId = organizationIds.get(membership.organization)!;
        await prisma.organizationMember.upsert({
          where: { organizationId_userId: { organizationId, userId: user.id } },
          update: { role: membership.role, status: 'ACTIVE' },
          create: { organizationId, userId: user.id, role: membership.role },
        });
      }
    }

    const demoData = [
      {
        slug: 'horizonte-demo',
        customers: HORIZONTE_CUSTOMERS,
        deals: [...HORIZONTE_DEALS, ...HORIZONTE_PAST_DEALS],
        tasks: HORIZONTE_TASKS,
        activities: HORIZONTE_ACTIVITIES,
      },
      {
        slug: 'vertice-demo',
        customers: VERTICE_CUSTOMERS,
        deals: VERTICE_DEALS,
        tasks: VERTICE_TASKS,
        activities: VERTICE_ACTIVITIES,
      },
    ];
    for (const demo of demoData) {
      const organizationId = organizationIds.get(demo.slug)!;
      // Tarefas, atividades e negócios primeiro: referenciam clientes e negócios sem cascata.
      await prisma.task.deleteMany({ where: { organizationId } });
      await prisma.activity.deleteMany({ where: { organizationId } });
      await prisma.deal.deleteMany({ where: { organizationId } });
      const customerIds = await seedCustomers(prisma, organizationId, demo.customers, userIds);
      const pipelineId = await ensureDefaultPipeline(prisma, organizationId);
      const dealIds = await seedDeals(
        prisma,
        organizationId,
        pipelineId,
        demo.deals,
        customerIds,
        userIds,
      );
      const refs = { customerIds, dealIds, userIds };
      await seedTasks(prisma, organizationId, demo.tasks, refs);
      await seedActivities(prisma, organizationId, demo.activities, refs);
    }

    console.log('Seed de demonstração concluída:');
    console.table(
      DEMO_USERS.map((user) => ({
        email: user.email,
        perfis: user.memberships.map((m) => `${m.role} @ ${m.organization}`).join(', '),
      })),
    );
    console.log(
      `Clientes fictícios: ${HORIZONTE_CUSTOMERS.length} (Horizonte) e ${VERTICE_CUSTOMERS.length} (Vértice).`,
    );
    console.log(
      `Negócios fictícios: ${HORIZONTE_DEALS.length + HORIZONTE_PAST_DEALS.length} (Horizonte) e ${VERTICE_DEALS.length} (Vértice).`,
    );
    console.log(
      `Tarefas fictícias: ${HORIZONTE_TASKS.length + VERTICE_TASKS.length}; atividades: ${HORIZONTE_ACTIVITIES.length + VERTICE_ACTIVITIES.length}.`,
    );
    console.log('Senha das contas: valor de SEED_DEMO_PASSWORD no arquivo .env');
  } finally {
    await prisma.$disconnect();
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Recria os clientes das organizações de DEMONSTRAÇÃO (os contatos são removidos em cascata),
 * mantendo a seed idempotente e os dados sempre no mesmo estado inicial.
 */
async function seedCustomers(
  prisma: PrismaClient,
  organizationId: string,
  customers: DemoCustomer[],
  userIds: Map<string, string>,
): Promise<Map<string, string>> {
  await prisma.customer.updateMany({ where: { organizationId }, data: { companyId: null } });
  await prisma.customer.deleteMany({ where: { organizationId } });

  const createdBy = userIds.get('ana') ?? null;
  const idsByKey = new Map<string, string>();
  // Empresas primeiro, para que as pessoas físicas possam ser vinculadas a elas.
  const ordered = [...customers].sort(
    (a, b) => Number(a.type === 'PERSON') - Number(b.type === 'PERSON'),
  );

  for (const demo of ordered) {
    const createdAt = new Date(Date.now() - demo.daysAgo * DAY_MS);
    const document = demo.documentBase
      ? demo.type === 'COMPANY'
        ? completeCnpj(demo.documentBase)
        : completeCpf(demo.documentBase)
      : null;

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        type: demo.type,
        name: demo.name,
        tradeName: demo.tradeName ?? null,
        document,
        email: demo.email ?? null,
        phone: demo.phone ?? null,
        website: demo.website ?? null,
        city: demo.city,
        state: demo.state,
        status: demo.status,
        tags: demo.tags,
        notes: demo.notes ?? null,
        ownerId: demo.owner ? userIds.get(demo.owner)! : null,
        companyId: demo.company ? idsByKey.get(demo.company)! : null,
        createdById: createdBy,
        createdAt,
        updatedAt: createdAt,
      },
      select: { id: true },
    });
    idsByKey.set(demo.key, customer.id);

    if (demo.contacts?.length) {
      await prisma.contact.createMany({
        data: demo.contacts.map((contact) => ({
          organizationId,
          customerId: customer.id,
          name: contact.name,
          position: contact.position ?? null,
          email: contact.email ?? null,
          phone: contact.phone ?? null,
          isPrimary: contact.isPrimary ?? false,
          createdAt,
          updatedAt: createdAt,
        })),
      });
    }
  }
  return idsByKey;
}

async function ensureDefaultPipeline(prisma: PrismaClient, organizationId: string) {
  const existing = await prisma.pipeline.findFirst({
    where: { organizationId, isDefault: true },
    select: { id: true },
  });
  return (existing ?? (await createDefaultPipeline(prisma, organizationId))).id;
}

/**
 * Recria os negócios de DEMONSTRAÇÃO com um histórico plausível: cada negócio percorre as
 * etapas anteriores até a atual, com as datas distribuídas entre o cadastro e o fechamento.
 */
async function seedDeals(
  prisma: PrismaClient,
  organizationId: string,
  pipelineId: string,
  deals: DemoDeal[],
  customerIds: Map<string, string>,
  userIds: Map<string, string>,
): Promise<Map<string, string>> {
  const dealIds = new Map<string, string>();
  const stages = await prisma.pipelineStage.findMany({
    where: { pipelineId },
    orderBy: { position: 'asc' },
  });
  const openStages = stages.filter((stage) => stage.kind === 'OPEN');
  const positions = new Map<string, number>();
  const now = Date.now();

  for (const demo of deals) {
    const stage = stages.find((item) => item.name === demo.stage);
    if (!stage) throw new Error(`Etapa inexistente na seed: ${demo.stage}`);

    // Caminho percorrido: abertas até a atual; encerrados passam por parte do funil antes.
    const path =
      stage.kind === 'OPEN'
        ? openStages.filter((item) => item.position <= stage.position)
        : [...openStages.slice(0, stage.kind === 'WON' ? 5 : 3), stage];

    const createdAt = new Date(now - demo.createdDaysAgo * DAY_MS);
    const lastChange =
      demo.closedDaysAgo !== undefined ? now - demo.closedDaysAgo * DAY_MS : now - DAY_MS;
    const step = path.length > 1 ? (lastChange - createdAt.getTime()) / (path.length - 1) : 0;
    const changedAt = path.map((_, index) => new Date(createdAt.getTime() + step * index));
    const ownerId = demo.owner ? userIds.get(demo.owner)! : null;
    const position = positions.get(stage.id) ?? 0;
    positions.set(stage.id, position + 1);

    const deal = await prisma.deal.create({
      data: {
        organizationId,
        pipelineId,
        stageId: stage.id,
        customerId: customerIds.get(demo.customer)!,
        ownerId,
        title: demo.title,
        value: demo.value.toFixed(2),
        status: stage.kind,
        expectedCloseDate:
          demo.expectedInDays !== undefined
            ? new Date(
                `${new Date(now + demo.expectedInDays * DAY_MS).toISOString().slice(0, 10)}T00:00:00.000Z`,
              )
            : null,
        position,
        notes: demo.notes ?? null,
        lostReason: stage.kind === 'LOST' ? (demo.lostReason ?? 'Motivo não informado') : null,
        closedAt: stage.kind === 'OPEN' ? null : changedAt.at(-1)!,
        stageChangedAt: changedAt.at(-1)!,
        createdById: ownerId ?? userIds.get('ana') ?? null,
        createdAt,
        updatedAt: changedAt.at(-1)!,
      },
      select: { id: true },
    });
    dealIds.set(demo.title, deal.id);

    await prisma.dealStageHistory.createMany({
      data: path.map((item, index) => ({
        organizationId,
        dealId: deal.id,
        fromStageId: index > 0 ? path[index - 1]!.id : null,
        fromStageName: index > 0 ? path[index - 1]!.name : null,
        fromStatus: index > 0 ? ('OPEN' as const) : null,
        toStageId: item.id,
        toStageName: item.name,
        toStatus: item.kind,
        lostReason: item.kind === 'LOST' ? (demo.lostReason ?? null) : null,
        changedById: ownerId ?? userIds.get('ana') ?? null,
        createdAt: changedAt[index]!,
      })),
    });
  }
  return dealIds;
}

interface DemoRefs {
  customerIds: Map<string, string>;
  dealIds: Map<string, string>;
  userIds: Map<string, string>;
}

function lookup(map: Map<string, string>, key: string, label: string): string {
  const id = map.get(key);
  if (!id) throw new Error(`${label} inexistente na seed: ${key}`);
  return id;
}

/** Tarefas com prazos relativos a hoje (fuso de negócio): atrasadas, do dia e futuras. */
async function seedTasks(
  prisma: PrismaClient,
  organizationId: string,
  tasks: DemoTask[],
  refs: DemoRefs,
): Promise<void> {
  const today = zonedIsoDate(new Date(), BUSINESS_TIME_ZONE);
  const now = Date.now();
  await prisma.task.createMany({
    data: tasks.map((demo) => {
      const status = demo.status ?? 'TODO';
      const dueDate = addDays(today, demo.dueInDays);
      const createdAt = new Date(now - (Math.max(0, -demo.dueInDays) + 3) * DAY_MS);
      return {
        organizationId,
        title: demo.title,
        description: demo.description ?? null,
        status,
        priority: demo.priority,
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        completedAt:
          status === 'DONE' ? new Date(now - Math.max(0, -demo.dueInDays) * DAY_MS) : null,
        assigneeId: lookup(refs.userIds, demo.assignee, 'Usuário'),
        customerId: demo.customer ? lookup(refs.customerIds, demo.customer, 'Cliente') : null,
        dealId: demo.deal ? lookup(refs.dealIds, demo.deal, 'Negócio') : null,
        createdById: lookup(refs.userIds, demo.createdBy ?? demo.assignee, 'Usuário'),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  });
}

/** Interações registradas nos últimos dias, no horário comercial de Brasília. */
async function seedActivities(
  prisma: PrismaClient,
  organizationId: string,
  activities: DemoActivity[],
  refs: DemoRefs,
): Promise<void> {
  const now = Date.now();
  await prisma.activity.createMany({
    data: activities.map((demo) => {
      const day = zonedIsoDate(new Date(now - demo.daysAgo * DAY_MS), BUSINESS_TIME_ZONE);
      const scheduled = zonedStartOfDay(day, BUSINESS_TIME_ZONE).getTime() + demo.hour * 3_600_000;
      // Nunca no futuro: registros de hoje ficam, no máximo, uma hora atrás.
      const occurredAt = new Date(Math.min(scheduled, now - 3_600_000));
      return {
        organizationId,
        type: demo.type,
        subject: demo.subject,
        description: demo.description ?? null,
        occurredAt,
        customerId: lookup(refs.customerIds, demo.customer, 'Cliente'),
        dealId: demo.deal ? lookup(refs.dealIds, demo.deal, 'Negócio') : null,
        authorId: lookup(refs.userIds, demo.author, 'Usuário'),
        createdAt: occurredAt,
        updatedAt: occurredAt,
      };
    }),
  });
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
