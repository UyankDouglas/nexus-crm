import { Injectable } from '@nestjs/common';
import {
  BUSINESS_TIME_ZONE,
  granularityFor,
  MAX_EXPORT_ROWS,
  REPORT_TYPE_LABELS,
  validateRange,
  type ClosedDealItem,
  type DateRange,
  type Paginated,
  type ReportsOverview,
  type SellerReportRow,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { pageArgs, pageMeta } from '../../common/dto/pagination-query.dto';
import { AppException } from '../../common/errors/app.exception';
import type { ExportColumn } from '../../common/export/columns';
import { toCsv } from '../../common/export/csv';
import { toXlsx } from '../../common/export/xlsx';
import { zonedRangeBounds } from '../../common/time/zoned-date';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { activityScope } from '../activities/activity-scope';
import { actorOf, AuditService } from '../audit/audit.service';
import {
  buildSalesSeries,
  buildSellerRows,
  roundMoney,
  type OwnerTotals,
} from '../dashboard/dashboard-aggregation';
import { dealScope } from '../deals/deal-scope';
import { taskScope } from '../tasks/task-scope';
import type {
  ClosedDealsFilterDto,
  ClosedDealsQueryDto,
  ExportReportQueryDto,
  ReportPeriodDto,
} from './dto/report-query.dto';
import { REPORT_COLUMNS, type RevenueRow } from './report-columns';

const decimal = (value: Prisma.Decimal | null | undefined) => value?.toNumber() ?? 0;

export interface ExportedFile {
  filename: string;
  contentType: string;
  body: Buffer;
}

/**
 * Relatórios comerciais da organização (gestores e administradores). Os números usam os
 * mesmos escopos e o mesmo fuso de negócio do dashboard; a exportação gera CSV ou Excel a
 * partir das mesmas consultas, e cada exportação fica registrada na auditoria.
 */
/** AAAA-MM-DD → DD/MM/AAAA, como as datas aparecem na interface. */
function brazilianDate(isoDate: string): string {
  return isoDate.split('-').reverse().join('/');
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async overview(auth: TenantAuthContext, query: ReportPeriodDto): Promise<ReportsOverview> {
    const range = this.range(query);
    const granularity = granularityFor(range);
    const period = zonedRangeBounds(range, BUSINESS_TIME_ZONE);
    const deals = dealScope(auth);
    const closed = (status: 'WON' | 'LOST'): Prisma.DealWhereInput => ({
      AND: [deals, { status, closedAt: period }],
    });

    const [won, lostByOwner, openByOwner, openByStage, stages, lossReasons, activities, tasks] =
      await Promise.all([
        this.prisma.deal.findMany({
          where: closed('WON'),
          select: { closedAt: true, value: true, ownerId: true },
        }),
        this.prisma.deal.groupBy({
          by: ['ownerId'],
          where: closed('LOST'),
          orderBy: { ownerId: 'asc' },
          _count: { _all: true },
          _sum: { value: true },
        }),
        this.prisma.deal.groupBy({
          by: ['ownerId'],
          where: { AND: [deals, { status: 'OPEN' }] },
          orderBy: { ownerId: 'asc' },
          _count: { _all: true },
          _sum: { value: true },
        }),
        this.prisma.deal.groupBy({
          by: ['stageId'],
          where: { AND: [deals, { status: 'OPEN' }] },
          orderBy: { stageId: 'asc' },
          _count: { _all: true },
          _sum: { value: true },
        }),
        this.prisma.pipelineStage.findMany({
          where: { organizationId: auth.organization.id, kind: 'OPEN' },
          include: { pipeline: { select: { name: true, isDefault: true } } },
          orderBy: [{ pipeline: { createdAt: 'asc' } }, { position: 'asc' }],
        }),
        this.prisma.deal.groupBy({
          by: ['lostReason'],
          where: closed('LOST'),
          orderBy: { _count: { lostReason: 'desc' } },
          _count: { lostReason: true },
          _sum: { value: true },
          take: 10,
        }),
        this.prisma.activity.groupBy({
          by: ['authorId'],
          where: { AND: [activityScope(auth), { occurredAt: period }] },
          orderBy: { authorId: 'asc' },
          _count: { _all: true },
        }),
        this.prisma.task.groupBy({
          by: ['assigneeId'],
          where: { AND: [taskScope(auth), { status: 'DONE', completedAt: period }] },
          orderBy: { assigneeId: 'asc' },
          _count: { _all: true },
        }),
      ]);

    const wonDeals = won.map((deal) => ({
      closedAt: deal.closedAt!,
      value: decimal(deal.value),
      ownerId: deal.ownerId,
    }));
    const wonValue = roundMoney(wonDeals.reduce((sum, deal) => sum + deal.value, 0));
    const lostCount = lostByOwner.reduce((sum, group) => sum + group._count._all, 0);
    const lostValue = roundMoney(lostByOwner.reduce((sum, g) => sum + decimal(g._sum.value), 0));
    const openCount = openByOwner.reduce((sum, group) => sum + group._count._all, 0);
    const openValue = roundMoney(openByOwner.reduce((sum, g) => sum + decimal(g._sum.value), 0));

    const pipeline = stages.map((stage) => {
      const group = openByStage.find((item) => item.stageId === stage.id);
      const value = roundMoney(decimal(group?._sum.value));
      return {
        stageId: stage.id,
        name: stage.name,
        pipelineId: stage.pipelineId,
        pipelineName: stage.pipeline.name,
        probability: stage.probability,
        count: group?._count._all ?? 0,
        value,
        weightedValue: roundMoney((value * stage.probability) / 100),
      };
    });

    const sellers = await this.sellerRows(
      auth,
      wonDeals,
      lostByOwner,
      openByOwner,
      activities,
      tasks,
    );
    const closedCount = wonDeals.length + lostCount;

    return {
      period: { ...range, granularity },
      totals: {
        wonCount: wonDeals.length,
        wonValue,
        lostCount,
        lostValue,
        conversionRate: closedCount > 0 ? wonDeals.length / closedCount : null,
        averageTicket: wonDeals.length > 0 ? roundMoney(wonValue / wonDeals.length) : null,
        openCount,
        openValue,
        weightedValue: roundMoney(pipeline.reduce((sum, stage) => sum + stage.weightedValue, 0)),
      },
      sellers,
      revenue: buildSalesSeries(wonDeals, range, granularity, BUSINESS_TIME_ZONE),
      pipeline,
      lossReasons: lossReasons.map((group) => ({
        reason: group.lostReason ?? 'Motivo não informado',
        count: group._count.lostReason,
        value: roundMoney(decimal(group._sum.value)),
      })),
    };
  }

  /** Negócios ganhos e perdidos no período, do fechamento mais recente para o mais antigo. */
  async closedDeals(
    auth: TenantAuthContext,
    query: ClosedDealsQueryDto,
  ): Promise<Paginated<ClosedDealItem>> {
    const where = this.closedDealsWhere(auth, query);
    const [total, deals] = await this.prisma.$transaction([
      this.prisma.deal.count({ where }),
      this.prisma.deal.findMany({
        where,
        include: closedDealInclude,
        orderBy: [{ closedAt: 'desc' }, { id: 'desc' }],
        ...pageArgs(query),
      }),
    ]);
    return { data: deals.map(toClosedDealItem), meta: pageMeta(query, total) };
  }

  async export(auth: TenantAuthContext, query: ExportReportQueryDto): Promise<ExportedFile> {
    const range = this.range(query);
    const { rows, columns } = await this.exportRows(auth, query);
    const title = REPORT_TYPE_LABELS[query.type];
    const body =
      query.format === 'csv'
        ? toCsv(columns as ExportColumn<unknown>[], rows)
        : toXlsx(title, columns as ExportColumn<unknown>[], rows);

    await this.audit.record(this.prisma, actorOf(auth), {
      action: 'report.exported',
      entityType: 'report',
      summary: `Relatório "${title}" exportado em ${query.format.toUpperCase()} (${brazilianDate(range.from)} a ${brazilianDate(range.to)}, ${rows.length} linhas).`,
      metadata: { type: query.type, format: query.format, ...range, rows: rows.length },
    });

    return {
      filename: `nexus-crm-${query.type}-${range.from}-a-${range.to}.${query.format}`,
      contentType:
        query.format === 'csv'
          ? 'text/csv; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body,
    };
  }

  private async exportRows(
    auth: TenantAuthContext,
    query: ExportReportQueryDto,
  ): Promise<{ rows: unknown[]; columns: ExportColumn<never>[] }> {
    if (query.type === 'closed-deals') {
      const where = this.closedDealsWhere(auth, query);
      const deals = await this.prisma.deal.findMany({
        where,
        include: closedDealInclude,
        orderBy: [{ closedAt: 'desc' }, { id: 'desc' }],
        take: MAX_EXPORT_ROWS + 1,
      });
      if (deals.length > MAX_EXPORT_ROWS) {
        throw AppException.validation({
          from: [
            `O período tem mais de ${MAX_EXPORT_ROWS.toLocaleString('pt-BR')} negócios. Reduza o intervalo.`,
          ],
        });
      }
      return { rows: deals.map(toClosedDealItem), columns: REPORT_COLUMNS['closed-deals'] };
    }

    const overview = await this.overview(auth, query);
    if (query.type === 'sellers')
      return { rows: overview.sellers, columns: REPORT_COLUMNS.sellers };
    if (query.type === 'pipeline')
      return { rows: overview.pipeline, columns: REPORT_COLUMNS.pipeline };

    let cumulative = 0;
    const revenue: RevenueRow[] = overview.revenue.map((bucket) => {
      cumulative = roundMoney(cumulative + bucket.wonValue);
      return { ...bucket, granularity: overview.period.granularity, cumulative };
    });
    return { rows: revenue, columns: REPORT_COLUMNS.revenue };
  }

  private async sellerRows(
    auth: TenantAuthContext,
    won: Array<{ ownerId: string | null; value: number }>,
    lost: Array<{ ownerId: string | null; _count: { _all: number } }>,
    open: Array<{
      ownerId: string | null;
      _count: { _all: number };
      _sum: { value: Prisma.Decimal | null };
    }>,
    activities: Array<{ authorId: string; _count: { _all: number } }>,
    tasks: Array<{ assigneeId: string; _count: { _all: number } }>,
  ): Promise<SellerReportRow[]> {
    const partials: OwnerTotals[] = [
      ...won.map((deal) => ({ ownerId: deal.ownerId, wonCount: 1, wonValue: deal.value })),
      ...lost.map((group) => ({ ownerId: group.ownerId, lostCount: group._count._all })),
      ...open.map((group) => ({
        ownerId: group.ownerId,
        openCount: group._count._all,
        openValue: decimal(group._sum.value),
      })),
      // Quem só registrou atividades ou concluiu tarefas também aparece no relatório.
      ...activities.map((group) => ({ ownerId: group.authorId })),
      ...tasks.map((group) => ({ ownerId: group.assigneeId })),
    ];

    const team = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: auth.organization.id,
        status: 'ACTIVE',
        role: { in: ['SALES', 'MANAGER'] },
      },
      select: { userId: true },
    });
    const alwaysInclude = team.map((member) => member.userId);
    const ids = new Set(alwaysInclude);
    for (const partial of partials) if (partial.ownerId) ids.add(partial.ownerId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, name: true },
    });

    const activityCount = new Map(activities.map((group) => [group.authorId, group._count._all]));
    const taskCount = new Map(tasks.map((group) => [group.assigneeId, group._count._all]));
    return buildSellerRows(partials, users, alwaysInclude).map((row) => ({
      ...row,
      averageTicket: row.wonCount > 0 ? roundMoney(row.wonValue / row.wonCount) : null,
      activities: row.user ? (activityCount.get(row.user.id) ?? 0) : 0,
      tasksCompleted: row.user ? (taskCount.get(row.user.id) ?? 0) : 0,
    }));
  }

  private closedDealsWhere(
    auth: TenantAuthContext,
    query: ClosedDealsFilterDto,
  ): Prisma.DealWhereInput {
    const period = zonedRangeBounds(this.range(query), BUSINESS_TIME_ZONE);
    return {
      AND: [
        dealScope(auth),
        { status: query.status === 'all' ? { in: ['WON', 'LOST'] } : query.status },
        { closedAt: period },
      ],
    };
  }

  private range(query: ReportPeriodDto): DateRange {
    const range = { from: query.from, to: query.to };
    const error = validateRange(range);
    if (error) throw AppException.validation({ from: [error] });
    return range;
  }
}

const closedDealInclude = {
  customer: { select: { id: true, name: true } },
  ownerMembership: { select: { user: { select: { id: true, name: true } } } },
  stage: { select: { name: true } },
} satisfies Prisma.DealInclude;

type ClosedDealRecord = Prisma.DealGetPayload<{ include: typeof closedDealInclude }>;

function toClosedDealItem(deal: ClosedDealRecord): ClosedDealItem {
  return {
    id: deal.id,
    title: deal.title,
    status: deal.status as 'WON' | 'LOST',
    value: decimal(deal.value),
    closedAt: deal.closedAt!.toISOString(),
    stageName: deal.stage.name,
    lostReason: deal.lostReason,
    customer: deal.customer,
    owner: deal.ownerMembership?.user ?? null,
  };
}
