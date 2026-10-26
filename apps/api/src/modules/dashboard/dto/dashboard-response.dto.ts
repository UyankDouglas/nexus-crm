import { ApiProperty } from '@nestjs/swagger';
import type {
  DashboardSummary,
  Granularity,
  SalesBucket,
  SellerPerformance,
  StageSummary,
} from '@nexus/shared';
import { SummaryDto } from '../../tasks/dto/task-response.dto';

class PeriodDto {
  @ApiProperty({ format: 'date' }) from: string;
  @ApiProperty({ format: 'date' }) to: string;
  @ApiProperty({ enum: ['day', 'week', 'month'] }) granularity: Granularity;
}

class CustomersTotalDto {
  @ApiProperty() total: number;
}

class PipelineTotalsDto {
  @ApiProperty() openCount: number;
  @ApiProperty({ description: 'Soma dos negócios em andamento (R$).' }) openValue: number;
}

class ResultsDto {
  @ApiProperty() wonCount: number;
  @ApiProperty({ description: 'Receita dos negócios ganhos no período (R$).' }) wonValue: number;
  @ApiProperty() lostCount: number;
  @ApiProperty({ nullable: true, type: Number, description: 'Ganhos ÷ encerrados (0 a 1).' })
  conversionRate: number | null;
}

class TaskTotalsDto {
  @ApiProperty() open: number;
  @ApiProperty() overdue: number;
}

class SalesBucketDto implements SalesBucket {
  @ApiProperty({ format: 'date' }) start: string;
  @ApiProperty() wonCount: number;
  @ApiProperty() wonValue: number;
}

class StageSummaryDto implements StageSummary {
  @ApiProperty({ format: 'uuid' }) stageId: string;
  @ApiProperty() name: string;
  @ApiProperty() count: number;
  @ApiProperty() value: number;
}

class SellerPerformanceDto implements SellerPerformance {
  @ApiProperty({ type: SummaryDto, nullable: true }) user: SummaryDto | null;
  @ApiProperty() wonCount: number;
  @ApiProperty() wonValue: number;
  @ApiProperty() lostCount: number;
  @ApiProperty() openCount: number;
  @ApiProperty() openValue: number;
  @ApiProperty({ nullable: true, type: Number }) conversionRate: number | null;
}

class DistributionDto {
  @ApiProperty() open: number;
  @ApiProperty() won: number;
  @ApiProperty() lost: number;
}

export class DashboardSummaryDto implements DashboardSummary {
  @ApiProperty({ type: PeriodDto }) period: PeriodDto;
  @ApiProperty({ type: CustomersTotalDto }) customers: CustomersTotalDto;
  @ApiProperty({ type: PipelineTotalsDto }) pipeline: PipelineTotalsDto;
  @ApiProperty({ type: ResultsDto }) results: ResultsDto;
  @ApiProperty({ type: TaskTotalsDto }) tasks: TaskTotalsDto;
  @ApiProperty({ type: [SalesBucketDto] }) sales: SalesBucketDto[];
  @ApiProperty({ type: [StageSummaryDto] }) stages: StageSummaryDto[];
  @ApiProperty({ type: [SellerPerformanceDto] }) sellers: SellerPerformanceDto[];
  @ApiProperty({ type: DistributionDto }) distribution: DistributionDto;
}
