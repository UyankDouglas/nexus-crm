import { ApiProperty } from '@nestjs/swagger';
import {
  ACTIVITY_TYPES,
  type ActivityItem,
  type ActivityType,
  type Paginated,
} from '@nexus/shared';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { DealSummaryDto, SummaryDto } from '../../tasks/dto/task-response.dto';

export class ActivityDto implements ActivityItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: ACTIVITY_TYPES }) type: ActivityType;
  @ApiProperty() subject: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ format: 'date-time' }) occurredAt: string;
  @ApiProperty({ type: SummaryDto }) customer: SummaryDto;
  @ApiProperty({ type: DealSummaryDto, nullable: true }) deal: DealSummaryDto | null;
  @ApiProperty({ type: SummaryDto }) author: SummaryDto;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class PaginatedActivitiesDto implements Paginated<ActivityItem> {
  @ApiProperty({ type: [ActivityDto] }) data: ActivityDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
