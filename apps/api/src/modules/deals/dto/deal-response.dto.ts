import { ApiProperty } from '@nestjs/swagger';
import {
  DEAL_STATUSES,
  STAGE_KINDS,
  type BoardColumn,
  type CustomerSummary,
  type DealBoard,
  type DealCard,
  type DealDetail,
  type DealHistoryItem,
  type DealListItem,
  type DealStats,
  type DealStatus,
  type PageMeta,
  type Paginated,
  type PipelineItem,
  type PipelineStageItem,
  type StageKind,
  type UserSummary,
} from '@nexus/shared';

class SummaryDto implements UserSummary, CustomerSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

export class PipelineStageDto implements PipelineStageItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: STAGE_KINDS }) kind: StageKind;
  @ApiProperty({ minimum: 0, maximum: 100 }) probability: number;
  @ApiProperty() position: number;
}

export class PipelineDto implements PipelineItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() isDefault: boolean;
  @ApiProperty({ type: [PipelineStageDto] }) stages: PipelineStageDto[];
}

export class DealCardDto implements DealCard {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty({ description: 'Valor potencial em reais.' }) value: number;
  @ApiProperty({ enum: DEAL_STATUSES }) status: DealStatus;
  @ApiProperty({ format: 'date', nullable: true, type: String }) expectedCloseDate: string | null;
  @ApiProperty({ format: 'uuid' }) stageId: string;
  @ApiProperty({ format: 'uuid' }) pipelineId: string;
  @ApiProperty({ type: SummaryDto }) customer: SummaryDto;
  @ApiProperty({ type: SummaryDto, nullable: true }) owner: SummaryDto | null;
  @ApiProperty({ format: 'date-time' }) stageChangedAt: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) closedAt: string | null;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class DealListItemDto extends DealCardDto implements DealListItem {
  @ApiProperty() stageName: string;
}

class DealHistoryDto implements DealHistoryItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ nullable: true, type: String }) fromStageName: string | null;
  @ApiProperty() toStageName: string;
  @ApiProperty({ enum: DEAL_STATUSES, nullable: true }) fromStatus: DealStatus | null;
  @ApiProperty({ enum: DEAL_STATUSES }) toStatus: DealStatus;
  @ApiProperty({ nullable: true, type: String }) lostReason: string | null;
  @ApiProperty({ type: SummaryDto, nullable: true }) changedBy: SummaryDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class DealDetailDto extends DealListItemDto implements DealDetail {
  @ApiProperty({ nullable: true, type: String }) notes: string | null;
  @ApiProperty({ nullable: true, type: String }) lostReason: string | null;
  @ApiProperty({ type: SummaryDto, nullable: true }) createdBy: SummaryDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: [DealHistoryDto] }) history: DealHistoryDto[];
}

class BoardColumnDto implements BoardColumn {
  @ApiProperty({ type: PipelineStageDto }) stage: PipelineStageDto;
  @ApiProperty({ type: [DealCardDto] }) deals: DealCardDto[];
  @ApiProperty() count: number;
  @ApiProperty() totalValue: number;
}

export class DealBoardDto implements DealBoard {
  @ApiProperty({ type: PipelineDto }) pipeline: PipelineDto;
  @ApiProperty({ type: [BoardColumnDto] }) columns: BoardColumnDto[];
  @ApiProperty() closedWindowDays: number;
}

class PageMetaDto implements PageMeta {
  @ApiProperty() page: number;
  @ApiProperty() pageSize: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class PaginatedDealsDto implements Paginated<DealListItem> {
  @ApiProperty({ type: [DealListItemDto] }) data: DealListItemDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}

class CountValueDto {
  @ApiProperty() count: number;
  @ApiProperty() value: number;
}

class CountDto {
  @ApiProperty() count: number;
}

export class DealStatsDto implements DealStats {
  @ApiProperty({ type: CountValueDto }) open: CountValueDto;
  @ApiProperty({ type: CountValueDto }) won: CountValueDto;
  @ApiProperty({ type: CountDto }) lost: CountDto;
  @ApiProperty({ nullable: true, type: Number, description: 'De 0 a 1.' })
  conversionRate: number | null;
}
