import { addDays, BUSINESS_TIME_ZONE } from '@nexus/shared';
import { zonedIsoDate } from '../../src/common/time/zoned-date';
import type { DealStatus } from '../../src/generated/prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';
import { addMember, createOrganization, createUser } from './test-app';

export type ScenarioUser = 'admin' | 'manager' | 'sofia' | 'bruno' | 'betaAdmin';

export const EMAILS: Record<ScenarioUser, string> = {
  admin: 'admin@alpha.example',
  manager: 'gestora@alpha.example',
  sofia: 'sofia@alpha.example',
  bruno: 'bruno@alpha.example',
  betaAdmin: 'admin@beta.example',
};

export interface SalesScenario {
  alphaId: string;
  betaId: string;
  ids: Record<ScenarioUser, string>;
  /** Um cliente por vendedor na Alpha e um cliente na Beta. */
  customers: Record<'sofia' | 'bruno' | 'beta', string>;
  /** Etapas do funil padrão da Alpha, pelo nome. */
  stages: Record<string, { id: string; pipelineId: string }>;
}

/**
 * Cenário comum aos testes comerciais:
 *  - Alpha: administradora, gestora e os vendedores Sofia e Bruno, cada um com um cliente;
 *  - Beta: administradora com um cliente próprio (verificação de isolamento).
 */
export async function seedSalesScenario(prisma: PrismaService): Promise<SalesScenario> {
  const alphaId = (await createOrganization(prisma, { name: 'Alpha', slug: 'alpha' })).id;
  const betaId = (await createOrganization(prisma, { name: 'Beta', slug: 'beta' })).id;

  const names: Record<ScenarioUser, string> = {
    admin: 'Admin',
    manager: 'Gestora',
    sofia: 'Sofia',
    bruno: 'Bruno',
    betaAdmin: 'Admin Beta',
  };
  const ids = {} as Record<ScenarioUser, string>;
  for (const key of Object.keys(EMAILS) as ScenarioUser[]) {
    ids[key] = (await createUser(prisma, { name: names[key], email: EMAILS[key] })).id;
  }
  await addMember(prisma, alphaId, ids.admin, 'ADMIN');
  await addMember(prisma, alphaId, ids.manager, 'MANAGER');
  await addMember(prisma, alphaId, ids.sofia, 'SALES');
  await addMember(prisma, alphaId, ids.bruno, 'SALES');
  await addMember(prisma, betaId, ids.betaAdmin, 'ADMIN');

  const customer = (organizationId: string, name: string, ownerId: string | null) =>
    prisma.customer
      .create({ data: { organizationId, type: 'COMPANY', name, ownerId }, select: { id: true } })
      .then((created) => created.id);

  const alphaStages = await prisma.pipelineStage.findMany({
    where: { organizationId: alphaId },
    select: { id: true, name: true, pipelineId: true },
  });

  return {
    alphaId,
    betaId,
    ids,
    customers: {
      sofia: await customer(alphaId, 'Cliente da Sofia', ids.sofia),
      bruno: await customer(alphaId, 'Cliente do Bruno', ids.bruno),
      beta: await customer(betaId, 'Cliente Beta', null),
    },
    stages: Object.fromEntries(
      alphaStages.map((stage) => [stage.name, { id: stage.id, pipelineId: stage.pipelineId }]),
    ),
  };
}

/** "Hoje" no fuso de negócio (o mesmo usado pela API para prazos e períodos). */
export function businessToday(): string {
  return zonedIsoDate(new Date(), BUSINESS_TIME_ZONE);
}

export function businessDate(offsetDays: number): string {
  return addDays(businessToday(), offsetDays);
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

/** Negócio gravado diretamente no banco, com datas controladas pelo teste. */
export async function insertDeal(
  prisma: PrismaService,
  organizationId: string,
  data: {
    customerId: string;
    ownerId: string | null;
    stageId: string;
    pipelineId: string;
    status: DealStatus;
    value: number;
    closedAt?: Date;
    createdAt?: Date;
  },
): Promise<string> {
  const deal = await prisma.deal.create({
    data: {
      organizationId,
      pipelineId: data.pipelineId,
      stageId: data.stageId,
      customerId: data.customerId,
      ownerId: data.ownerId,
      title: `Negócio ${data.status} ${data.value}`,
      value: data.value.toFixed(2),
      status: data.status,
      closedAt: data.status === 'OPEN' ? null : (data.closedAt ?? new Date()),
      lostReason: data.status === 'LOST' ? 'Escolheu um concorrente' : null,
      createdAt: data.createdAt,
    },
    select: { id: true },
  });
  return deal.id;
}
