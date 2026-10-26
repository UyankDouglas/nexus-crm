import { HttpStatus, Injectable } from '@nestjs/common';
import {
  API_ERROR_CODES,
  BOARD_CLOSED_WINDOW_DAYS,
  OWNER_FILTER_ME,
  OWNER_FILTER_NONE,
  type DealBoard,
  type DealDetail,
  type DealListItem,
  type DealStats,
  type Paginated,
  type PipelineItem,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import { assertActiveMember } from '../../common/tenancy/members';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { actorOf, AuditService } from '../audit/audit.service';
import { customerScope } from '../customers/customer-scope';
import { canAssignDeals, canReopenDeals, dealScope } from './deal-scope';
import { assertDealIsOpen, positionBetween, resolveTransition } from './deal-rules';
import {
  dealCardInclude,
  dealDetailInclude,
  dealListInclude,
  fromIsoDate,
  toDealCard,
  toDealDetail,
  toDealListItem,
  toPipelineItem,
} from './deal.mapper';
import type {
  BoardQueryDto,
  CreateDealDto,
  ListDealsQueryDto,
  MoveDealDto,
  UpdateDealDto,
} from './dto/deal-request.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

const ORDER_BY: Record<ListDealsQueryDto['sort'], Prisma.DealOrderByWithRelationInput[]> = {
  recent: [{ createdAt: 'desc' }, { id: 'desc' }],
  value: [{ value: 'desc' }, { id: 'desc' }],
  closeDate: [{ expectedCloseDate: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
  updated: [{ updatedAt: 'desc' }, { id: 'desc' }],
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPipelines(auth: TenantAuthContext): Promise<PipelineItem[]> {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { organizationId: auth.organization.id },
      include: { stages: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    return pipelines.map(toPipelineItem);
  }

  /**
   * Quadro Kanban: negócios em andamento e encerrados nos últimos dias, agrupados por etapa e
   * ordenados pela posição definida no arrastar e soltar.
   */
  async board(
    auth: TenantAuthContext,
    pipelineId: string,
    query: BoardQueryDto,
  ): Promise<DealBoard> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId: auth.organization.id },
      include: { stages: true },
    });
    if (!pipeline) throw AppException.notFound('Funil não encontrado.');

    const closedSince = new Date(Date.now() - BOARD_CLOSED_WINDOW_DAYS * DAY_MS);
    const deals = await this.prisma.deal.findMany({
      where: {
        AND: [
          dealScope(auth),
          { pipelineId },
          { OR: [{ status: 'OPEN' }, { closedAt: { gte: closedSince } }] },
          ...this.commonFilters(auth, query),
        ],
      },
      include: dealCardInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    const cards = deals.map(toDealCard);
    const item = toPipelineItem(pipeline);
    return {
      pipeline: item,
      closedWindowDays: BOARD_CLOSED_WINDOW_DAYS,
      columns: item.stages.map((stage) => {
        const columnDeals = cards.filter((deal) => deal.stageId === stage.id);
        return {
          stage,
          deals: columnDeals,
          count: columnDeals.length,
          totalValue: roundMoney(columnDeals.reduce((sum, deal) => sum + deal.value, 0)),
        };
      }),
    };
  }

  async list(auth: TenantAuthContext, query: ListDealsQueryDto): Promise<Paginated<DealListItem>> {
    const filters = this.commonFilters(auth, query);
    if (query.status) filters.push({ status: query.status });
    if (query.customerId) filters.push({ customerId: query.customerId });
    const where: Prisma.DealWhereInput = { AND: [dealScope(auth), ...filters] };

    const [total, deals] = await this.prisma.$transaction([
      this.prisma.deal.count({ where }),
      this.prisma.deal.findMany({
        where,
        include: dealListInclude,
        orderBy: ORDER_BY[query.sort],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      data: deals.map(toDealListItem),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async get(auth: TenantAuthContext, id: string): Promise<DealDetail> {
    const deal = await this.prisma.deal.findFirst({
      where: { AND: [dealScope(auth), { id }] },
      include: dealDetailInclude,
    });
    if (!deal) throw this.notFound();
    return toDealDetail(deal);
  }

  async create(auth: TenantAuthContext, dto: CreateDealDto): Promise<DealDetail> {
    const organizationId = auth.organization.id;
    await this.assertVisibleCustomer(auth, dto.customerId);
    const stage = await this.resolveInitialStage(organizationId, dto.stageId);
    const ownerId = await this.resolveOwnerForCreate(auth, dto.ownerId);

    const deal = await this.prisma.$transaction(async (tx) => {
      const first = await tx.deal.findFirst({
        where: { organizationId, stageId: stage.id },
        orderBy: { position: 'asc' },
        select: { position: true },
      });
      const created = await tx.deal.create({
        data: {
          organizationId,
          pipelineId: stage.pipelineId,
          stageId: stage.id,
          customerId: dto.customerId,
          ownerId,
          title: dto.title,
          value: dto.value.toFixed(2),
          expectedCloseDate: fromIsoDate(dto.expectedCloseDate) ?? null,
          notes: dto.notes ?? null,
          // Novos negócios entram no topo da coluna.
          position: positionBetween(null, null, first?.position ?? null) ?? 0,
          createdById: auth.user.id,
        },
        select: { id: true },
      });
      await tx.dealStageHistory.create({
        data: {
          organizationId,
          dealId: created.id,
          toStageId: stage.id,
          toStageName: stage.name,
          toStatus: 'OPEN',
          changedById: auth.user.id,
        },
      });
      return created;
    });

    return this.get(auth, deal.id);
  }

  /** Edita os dados do negócio. Encerrados ficam bloqueados até serem reabertos. */
  async update(auth: TenantAuthContext, id: string, dto: UpdateDealDto): Promise<DealDetail> {
    const existing = await this.findInScope(auth, id);
    assertDealIsOpen(existing.status);

    if (dto.customerId && dto.customerId !== existing.customerId) {
      await this.assertVisibleCustomer(auth, dto.customerId);
    }
    if (dto.ownerId !== undefined && dto.ownerId !== existing.ownerId) {
      await this.assertCanAssign(auth, dto.ownerId);
    }

    await this.prisma.deal.update({
      where: { organizationId_id: { organizationId: auth.organization.id, id } },
      data: {
        title: dto.title,
        customerId: dto.customerId,
        value: dto.value?.toFixed(2),
        expectedCloseDate: fromIsoDate(dto.expectedCloseDate),
        ownerId: dto.ownerId,
        notes: dto.notes,
      },
    });

    return this.get(auth, id);
  }

  /** Movimenta o negócio no funil (arrastar e soltar), registrando o histórico. */
  async move(auth: TenantAuthContext, id: string, dto: MoveDealDto): Promise<DealDetail> {
    const organizationId = auth.organization.id;
    const deal = await this.prisma.deal.findFirst({
      where: { AND: [dealScope(auth), { id }] },
      include: { stage: { select: { name: true } } },
    });
    if (!deal) throw this.notFound();

    const target = await this.prisma.pipelineStage.findFirst({
      where: { id: dto.stageId, organizationId, pipelineId: deal.pipelineId },
      select: { id: true, name: true, kind: true },
    });
    if (!target) {
      throw AppException.validation({ stageId: ['Etapa não encontrada neste funil.'] });
    }

    const transition = resolveTransition({
      current: {
        stageId: deal.stageId,
        status: deal.status,
        closedAt: deal.closedAt,
        lostReason: deal.lostReason,
      },
      target,
      canReopen: canReopenDeals(auth),
      lostReason: dto.lostReason,
    });

    await this.prisma.$transaction(async (tx) => {
      const position = await this.computePosition(
        tx,
        organizationId,
        target.id,
        deal.id,
        dto.afterDealId ?? null,
      );
      await tx.deal.update({
        where: { organizationId_id: { organizationId, id } },
        data: {
          stageId: target.id,
          status: transition.status,
          closedAt: transition.closedAt,
          lostReason: transition.lostReason,
          position,
          ...(transition.stageChanged ? { stageChangedAt: new Date() } : {}),
        },
      });
      if (deal.status !== 'OPEN' && transition.status === 'OPEN') {
        await this.audit.record(tx, actorOf(auth), {
          action: 'deal.reopened',
          entityType: 'deal',
          entityId: deal.id,
          summary: `Negócio ${deal.title} reaberto em ${target.name}.`,
          metadata: { from: deal.status, stage: target.name },
        });
      }
      if (transition.stageChanged) {
        await tx.dealStageHistory.create({
          data: {
            organizationId,
            dealId: deal.id,
            fromStageId: deal.stageId,
            fromStageName: deal.stage.name,
            fromStatus: deal.status,
            toStageId: target.id,
            toStageName: target.name,
            toStatus: transition.status,
            lostReason: transition.lostReason,
            changedById: auth.user.id,
          },
        });
      }
    });

    return this.get(auth, id);
  }

  /**
   * Exclui o negócio e seu histórico de etapas. Tarefas e atividades vinculadas continuam no
   * cliente: o vínculo com o negócio é desfeito na mesma transação.
   */
  async remove(auth: TenantAuthContext, id: string): Promise<void> {
    const deal = await this.findInScope(auth, id);
    const organizationId = auth.organization.id;
    await this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({ where: { organizationId, dealId: id }, data: { dealId: null } });
      await tx.activity.updateMany({
        where: { organizationId, dealId: id },
        data: { dealId: null },
      });
      await tx.deal.delete({ where: { organizationId_id: { organizationId, id } } });
      await this.audit.record(tx, actorOf(auth), {
        action: 'deal.deleted',
        entityType: 'deal',
        entityId: id,
        summary: `Negócio ${deal.title} excluído.`,
        metadata: { title: deal.title, status: deal.status },
      });
    });
  }

  async stats(auth: TenantAuthContext): Promise<DealStats> {
    const groups = await this.prisma.deal.groupBy({
      by: ['status'],
      where: dealScope(auth),
      orderBy: { status: 'asc' },
      _count: { _all: true },
      _sum: { value: true },
    });
    const find = (status: 'OPEN' | 'WON' | 'LOST') => {
      const group = groups.find((item) => item.status === status);
      return {
        count: group?._count._all ?? 0,
        value: roundMoney(group?._sum?.value?.toNumber() ?? 0),
      };
    };

    const open = find('OPEN');
    const won = find('WON');
    const lost = find('LOST');
    const closed = won.count + lost.count;
    return {
      open,
      won,
      lost: { count: lost.count },
      conversionRate: closed > 0 ? won.count / closed : null,
    };
  }

  private async findInScope(auth: TenantAuthContext, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { AND: [dealScope(auth), { id }] },
      select: { id: true, title: true, status: true, ownerId: true, customerId: true },
    });
    if (!deal) throw this.notFound();
    return deal;
  }

  private commonFilters(auth: TenantAuthContext, query: BoardQueryDto): Prisma.DealWhereInput[] {
    const filters: Prisma.DealWhereInput[] = [];
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      filters.push({ OR: [{ title: contains }, { customer: { name: contains } }] });
    }
    if (query.owner === OWNER_FILTER_ME) filters.push({ ownerId: auth.user.id });
    else if (query.owner === OWNER_FILTER_NONE) filters.push({ ownerId: null });
    else if (query.owner) filters.push({ ownerId: query.owner });
    return filters;
  }

  /**
   * Posição no destino. `afterDealId` deve ser um negócio da mesma etapa; sem ele, o card vai
   * para o topo. Quando o espaço entre vizinhos se esgota, a coluna é renumerada.
   */
  private async computePosition(
    tx: Prisma.TransactionClient,
    organizationId: string,
    stageId: string,
    dealId: string,
    afterDealId: string | null,
  ): Promise<number> {
    const siblings: Prisma.DealWhereInput = { organizationId, stageId, id: { not: dealId } };

    let after: number | null = null;
    if (afterDealId) {
      const anchor =
        afterDealId === dealId
          ? null
          : await tx.deal.findFirst({
              where: { organizationId, stageId, id: afterDealId },
              select: { position: true },
            });
      if (!anchor) throw AppException.validation({ afterDealId: ['Posição inválida.'] });
      after = anchor.position;
    }

    const neighbor = await tx.deal.findFirst({
      where: after === null ? siblings : { ...siblings, position: { gt: after } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });
    const position =
      after === null
        ? positionBetween(null, null, neighbor?.position ?? null)
        : positionBetween(after, neighbor?.position ?? null, null);
    if (position !== null) return position;

    const column = await tx.deal.findMany({
      where: siblings,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    for (const [index, item] of column.entries()) {
      await tx.deal.update({ where: { id: item.id }, data: { position: index } });
    }
    return this.computePosition(tx, organizationId, stageId, dealId, afterDealId);
  }

  private async resolveInitialStage(organizationId: string, stageId: string | null | undefined) {
    const stage = stageId
      ? await this.prisma.pipelineStage.findFirst({
          where: { id: stageId, organizationId, kind: 'OPEN' },
        })
      : await this.prisma.pipelineStage.findFirst({
          where: { organizationId, kind: 'OPEN', pipeline: { isDefault: true } },
          orderBy: { position: 'asc' },
        });

    if (!stage) {
      if (stageId) {
        throw AppException.validation({ stageId: ['Selecione uma etapa em andamento do funil.'] });
      }
      throw new AppException(
        HttpStatus.CONFLICT,
        API_ERROR_CODES.CONFLICT,
        'A organização ainda não tem um funil de vendas configurado.',
      );
    }
    return stage;
  }

  private async assertVisibleCustomer(auth: TenantAuthContext, customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: { AND: [customerScope(auth), { id: customerId }] },
      select: { id: true },
    });
    if (!customer) throw AppException.validation({ customerId: ['Cliente não encontrado.'] });
  }

  private async resolveOwnerForCreate(
    auth: TenantAuthContext,
    ownerId: string | null | undefined,
  ): Promise<string | null> {
    if (ownerId === undefined || ownerId === auth.user.id) return auth.user.id;
    await this.assertCanAssign(auth, ownerId);
    return ownerId;
  }

  private async assertCanAssign(auth: TenantAuthContext, ownerId: string | null): Promise<void> {
    if (!canAssignDeals(auth)) {
      throw AppException.forbidden('Somente gestores e administradores podem distribuir negócios.');
    }
    if (ownerId !== null) await assertActiveMember(this.prisma, auth.organization.id, ownerId);
  }

  private notFound(): AppException {
    return AppException.notFound('Negócio não encontrado.');
  }
}
