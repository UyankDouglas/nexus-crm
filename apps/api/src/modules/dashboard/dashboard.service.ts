import { Injectable } from '@nestjs/common';
import {
  BUSINESS_TIME_ZONE,
  granularityFor,
  hasPermission,
  validateRange,
  type DashboardSummary,
  type DateRange,
  type StageSummary,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import { zonedRangeBounds } from '../../common/time/zoned-date';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { customerScope } from '../customers/customer-scope';
import { dealScope } from '../deals/deal-scope';
import { TasksService } from '../tasks/tasks.service';
import {
  buildSalesSeries,
  buildSellerRows,
  roundMoney,
  type OwnerTotals,
} from './dashboard-aggregation';
import type { DashboardQueryDto } from './dto/dashboard-query.dto';

const decimal = (value: Prisma.Decimal | null | undefined) => value?.toNumber() ?? 0;

/**
 * Indicadores do painel inicial, calculados no banco sobre o escopo do usuário: os mesmos
 * filtros de carteira usados nas listagens (`customerScope`, `dealScope`, escopo de tarefas).
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
  ) {}

  async summary(auth: TenantAuthContext, query: DashboardQueryDto): Promise<DashboardSummary> {
    const range: DateRange = { from: query.from, to: query.to };
    const error = validateRange(range);
    if (error) throw AppException.validation({ from: [error] });

    const granularity = granularityFor(range);
    const period = zonedRangeBounds(range, BUSINESS_TIME_ZONE);
    const deals = dealScope(auth);
    const closedIn = (status: 'WON' | 'LOST'): Prisma.DealWhereInput => ({
      AND: [deals, { status, closedAt: period }],
    });
    const openDeals: Prisma.DealWhereInput = { AND: [deals, { status: 'OPEN' }] };

    const [customers, won, lostByOwner, openByOwner, created, taskStats, stages] =
      await Promise.all([
        this.prisma.customer.count({ where: customerScope(auth) }),
        this.prisma.deal.findMany({
          where: closedIn('WON'),
          select: { closedAt: true, value: true, ownerId: true },
        }),
        this.prisma.deal.groupBy({
          by: ['ownerId'],
          where: closedIn('LOST'),
          orderBy: { ownerId: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.deal.groupBy({
          by: ['ownerId'],
          where: openDeals,
          orderBy: { ownerId: 'asc' },
          _count: { _all: true },
          _sum: { value: true },
        }),
        this.prisma.deal.groupBy({
          by: ['status'],
          where: { AND: [deals, { createdAt: period }] },
          orderBy: { status: 'asc' },
          _count: { _all: true },
        }),
        this.tasks.stats(auth),
        this.openDealsByStage(auth),
      ]);

    const wonDeals = won.map((deal) => ({
      closedAt: deal.closedAt!,
      value: decimal(deal.value),
      ownerId: deal.ownerId,
    }));
    const wonValue = roundMoney(wonDeals.reduce((sum, deal) => sum + deal.value, 0));
    const lostCount = lostByOwner.reduce((sum, group) => sum + group._count._all, 0);
    const closedCount = wonDeals.length + lostCount;
    const createdCount = (status: 'OPEN' | 'WON' | 'LOST') =>
      created.find((group) => group.status === status)?._count._all ?? 0;

    return {
      period: { ...range, granularity },
      customers: { total: customers },
      pipeline: {
        openCount: openByOwner.reduce((sum, group) => sum + group._count._all, 0),
        openValue: roundMoney(
          openByOwner.reduce((sum, group) => sum + decimal(group._sum.value), 0),
        ),
      },
      results: {
        wonCount: wonDeals.length,
        wonValue,
        lostCount,
        conversionRate: closedCount > 0 ? wonDeals.length / closedCount : null,
      },
      tasks: { open: taskStats.open, overdue: taskStats.overdue },
      sales: buildSalesSeries(wonDeals, range, granularity, BUSINESS_TIME_ZONE),
      stages,
      sellers: await this.sellers(auth, [
        ...wonDeals.map((deal) => ({ ownerId: deal.ownerId, wonCount: 1, wonValue: deal.value })),
        ...lostByOwner.map((group) => ({ ownerId: group.ownerId, lostCount: group._count._all })),
        ...openByOwner.map((group) => ({
          ownerId: group.ownerId,
          openCount: group._count._all,
          openValue: decimal(group._sum.value),
        })),
      ]),
      distribution: {
        open: createdCount('OPEN'),
        won: createdCount('WON'),
        lost: createdCount('LOST'),
      },
    };
  }

  /** Negócios em andamento por etapa do funil padrão (fotografia atual). */
  private async openDealsByStage(auth: TenantAuthContext): Promise<StageSummary[]> {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { organizationId: auth.organization.id, isDefault: true },
      include: { stages: { where: { kind: 'OPEN' }, orderBy: { position: 'asc' } } },
    });
    if (!pipeline) return [];

    const groups = await this.prisma.deal.groupBy({
      by: ['stageId'],
      where: { AND: [dealScope(auth), { pipelineId: pipeline.id, status: 'OPEN' }] },
      orderBy: { stageId: 'asc' },
      _count: { _all: true },
      _sum: { value: true },
    });
    return pipeline.stages.map((stage) => {
      const group = groups.find((item) => item.stageId === stage.id);
      return {
        stageId: stage.id,
        name: stage.name,
        count: group?._count._all ?? 0,
        value: roundMoney(decimal(group?._sum.value)),
      };
    });
  }

  /**
   * Gestores comparam toda a equipe (vendedores ativos aparecem mesmo sem movimento); o
   * vendedor vê apenas a própria linha, já que o escopo de negócios só traz a carteira dele.
   */
  private async sellers(auth: TenantAuthContext, partials: OwnerTotals[]) {
    const teamView = hasPermission(auth.membership.role, 'deals:read-all');
    const activeSellers = teamView
      ? await this.prisma.organizationMember.findMany({
          where: { organizationId: auth.organization.id, role: 'SALES', status: 'ACTIVE' },
          select: { userId: true },
        })
      : [];
    const alwaysInclude = teamView ? activeSellers.map((member) => member.userId) : [auth.user.id];

    const ids = new Set<string>(alwaysInclude);
    for (const partial of partials) if (partial.ownerId) ids.add(partial.ownerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });
    return buildSellerRows(partials, users, alwaysInclude);
  }
}
