import type {
  DealCard,
  DealDetail,
  DealHistoryItem,
  DealListItem,
  PipelineItem,
  PipelineStageItem,
} from '@nexus/shared';
import type { Prisma } from '../../generated/prisma/client';

const userSummary = { select: { id: true, name: true } } as const;

export const dealCardInclude = {
  customer: { select: { id: true, name: true } },
  ownerMembership: { select: { user: userSummary } },
} satisfies Prisma.DealInclude;

export const dealListInclude = {
  ...dealCardInclude,
  stage: { select: { name: true } },
} satisfies Prisma.DealInclude;

export const dealDetailInclude = {
  ...dealListInclude,
  createdBy: userSummary,
  history: {
    orderBy: { createdAt: 'desc' },
    include: { changedBy: userSummary },
  },
} satisfies Prisma.DealInclude;

type DealWithCard = Prisma.DealGetPayload<{ include: typeof dealCardInclude }>;
type DealWithList = Prisma.DealGetPayload<{ include: typeof dealListInclude }>;
type DealWithDetail = Prisma.DealGetPayload<{ include: typeof dealDetailInclude }>;
type StageRecord = Prisma.PipelineStageGetPayload<object>;
type PipelineWithStages = Prisma.PipelineGetPayload<{ include: { stages: true } }>;

/** Datas sem horário são gravadas como meia-noite UTC. */
export function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function fromIsoDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  return value === null ? null : new Date(`${value}T00:00:00.000Z`);
}

export function toStageItem(stage: StageRecord): PipelineStageItem {
  return {
    id: stage.id,
    name: stage.name,
    kind: stage.kind,
    probability: stage.probability,
    position: stage.position,
  };
}

export function toPipelineItem(pipeline: PipelineWithStages): PipelineItem {
  return {
    id: pipeline.id,
    name: pipeline.name,
    isDefault: pipeline.isDefault,
    stages: [...pipeline.stages].sort((a, b) => a.position - b.position).map(toStageItem),
  };
}

export function toDealCard(deal: DealWithCard): DealCard {
  return {
    id: deal.id,
    title: deal.title,
    value: deal.value.toNumber(),
    status: deal.status,
    expectedCloseDate: toIsoDate(deal.expectedCloseDate),
    stageId: deal.stageId,
    pipelineId: deal.pipelineId,
    customer: deal.customer,
    owner: deal.ownerMembership?.user ?? null,
    stageChangedAt: deal.stageChangedAt.toISOString(),
    closedAt: deal.closedAt?.toISOString() ?? null,
    updatedAt: deal.updatedAt.toISOString(),
  };
}

export function toDealListItem(deal: DealWithList): DealListItem {
  return { ...toDealCard(deal), stageName: deal.stage.name };
}

function toHistoryItem(entry: DealWithDetail['history'][number]): DealHistoryItem {
  return {
    id: entry.id,
    fromStageName: entry.fromStageName,
    toStageName: entry.toStageName,
    fromStatus: entry.fromStatus,
    toStatus: entry.toStatus,
    lostReason: entry.lostReason,
    changedBy: entry.changedBy,
    createdAt: entry.createdAt.toISOString(),
  };
}

export function toDealDetail(deal: DealWithDetail): DealDetail {
  return {
    ...toDealListItem(deal),
    notes: deal.notes,
    lostReason: deal.lostReason,
    createdBy: deal.createdBy,
    createdAt: deal.createdAt.toISOString(),
    history: deal.history.map(toHistoryItem),
  };
}
