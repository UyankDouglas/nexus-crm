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
import { completeCnpj, completeCpf } from '@nexus/shared';
import { PrismaClient, type MemberRole } from '../src/generated/prisma/client';
import {
  HORIZONTE_CUSTOMERS,
  VERTICE_CUSTOMERS,
  type DemoCustomer,
  type DemoOwner,
} from './demo-customers';

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

    await seedCustomers(
      prisma,
      organizationIds.get('horizonte-demo')!,
      HORIZONTE_CUSTOMERS,
      userIds,
    );
    await seedCustomers(prisma, organizationIds.get('vertice-demo')!, VERTICE_CUSTOMERS, userIds);

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
): Promise<void> {
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
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
