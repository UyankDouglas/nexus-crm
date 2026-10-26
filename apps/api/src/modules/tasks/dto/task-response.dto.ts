import { ApiProperty } from '@nestjs/swagger';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CustomerSummary,
  type DealSummary,
  type Paginated,
  type TaskItem,
  type TaskPriority,
  type TaskStats,
  type TaskStatus,
  type UserSummary,
} from '@nexus/shared';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';

export class SummaryDto implements UserSummary, CustomerSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
}

export class DealSummaryDto implements DealSummary {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
}

export class TaskDto implements TaskItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ enum: TASK_STATUSES }) status: TaskStatus;
  @ApiProperty({ enum: TASK_PRIORITIES }) priority: TaskPriority;
  @ApiProperty({ format: 'date' }) dueDate: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) completedAt: string | null;
  @ApiProperty({ type: SummaryDto }) assignee: SummaryDto;
  @ApiProperty({ type: SummaryDto, nullable: true }) customer: SummaryDto | null;
  @ApiProperty({ type: DealSummaryDto, nullable: true }) deal: DealSummaryDto | null;
  @ApiProperty({ type: SummaryDto, nullable: true }) createdBy: SummaryDto | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
  @ApiProperty({ format: 'date-time' }) updatedAt: string;
}

export class PaginatedTasksDto implements Paginated<TaskItem> {
  @ApiProperty({ type: [TaskDto] }) data: TaskDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}

export class TaskStatsDto implements TaskStats {
  @ApiProperty({ description: 'A fazer + em andamento.' }) open: number;
  @ApiProperty() overdue: number;
  @ApiProperty() dueToday: number;
  @ApiProperty() completedLast7Days: number;
}
