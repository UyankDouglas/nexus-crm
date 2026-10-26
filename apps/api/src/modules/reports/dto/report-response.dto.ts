import { ApiProperty } from '@nestjs/swagger';
import type {
  ClosedDealItem,
  Granularity,
  LossReasonSummary,
  Paginated,
  PipelineStageReport,
  ReportsOverview,
  SalesBucket,
  SellerReportRow,
} from '@nexus/shared';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { SummaryDto } from '../../tasks/dto/task-response.dto';

class PeriodDto {
  @ApiProperty({ format: 'date' }) from: string;
  @ApiProperty({ format: 'date' }) to: string;
  @ApiProperty({ enum: ['day', 'week', 'month'] }) granularity: Granularity;
}

class TotalsDto {
  @ApiProperty() wonCount: number;
  @ApiProperty() wonValue: number;
  @ApiProperty() lostCount: number;
  @ApiProperty() lostValue: number;
  @ApiProperty({ nullable: true, type: Number }) conversionRate: number | null;
  @ApiProperty({ nullable: true, type: Number }) averageTicket: number | null;
  @ApiProperty() openCount: number;
  @ApiProperty() openValue: number;
  @ApiProperty({ description: 'Soma de valor × probabilidade das etapas.' }) weightedValue: number;
}

class SellerReportDto implements SellerReportRow {
  @ApiProperty({ type: SummaryDto, nullable: true }) user: SummaryDto | null;
  @ApiProperty() wonCount: number;
  @ApiProperty() wonValue: number;
  @ApiProperty() lostCount: number;
  @ApiProperty() openCount: number;
  @ApiProperty() openValue: number;
  @ApiProperty({ nullable: true, type: Number }) conversionRate: number | null;
  @ApiProperty({ nullable: true, type: Number }) averageTicket: number | null;
  @ApiProperty() activities: number;
  @ApiProperty() tasksCompleted: number;
}

class RevenueBucketDto implements SalesBucket {
  @ApiProperty({ format: 'date' }) start: string;
  @ApiProperty() wonCount: number;
  @ApiProperty() wonValue: number;
}

class PipelineStageReportDto implements PipelineStageReport {
  @ApiProperty({ format: 'uuid' }) stageId: string;
  @ApiProperty() name: string;
  @ApiProperty({ format: 'uuid' }) pipelineId: string;
  @ApiProperty() pipelineName: string;
  @ApiProperty() probability: number;
  @ApiProperty() count: number;
  @ApiProperty() value: number;
  @ApiProperty() weightedValue: number;
}

class LossReasonDto implements LossReasonSummary {
  @ApiProperty() reason: string;
  @ApiProperty() count: number;
  @ApiProperty() value: number;
}

export class ReportsOverviewDto implements ReportsOverview {
  @ApiProperty({ type: PeriodDto }) period: PeriodDto;
  @ApiProperty({ type: TotalsDto }) totals: TotalsDto;
  @ApiProperty({ type: [SellerReportDto] }) sellers: SellerReportDto[];
  @ApiProperty({ type: [RevenueBucketDto] }) revenue: RevenueBucketDto[];
  @ApiProperty({ type: [PipelineStageReportDto] }) pipeline: PipelineStageReportDto[];
  @ApiProperty({ type: [LossReasonDto] }) lossReasons: LossReasonDto[];
}

class ClosedDealDto implements ClosedDealItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty({ enum: ['WON', 'LOST'] }) status: 'WON' | 'LOST';
  @ApiProperty() value: number;
  @ApiProperty({ format: 'date-time' }) closedAt: string;
  @ApiProperty() stageName: string;
  @ApiProperty({ nullable: true, type: String }) lostReason: string | null;
  @ApiProperty({ type: SummaryDto }) customer: SummaryDto;
  @ApiProperty({ type: SummaryDto, nullable: true }) owner: SummaryDto | null;
}

export class PaginatedClosedDealsDto implements Paginated<ClosedDealItem> {
  @ApiProperty({ type: [ClosedDealDto] }) data: ClosedDealDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
