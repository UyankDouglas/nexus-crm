import { ApiProperty } from '@nestjs/swagger';
import { AUDIT_ACTIONS, type AuditAction, type AuditLogItem, type Paginated } from '@nexus/shared';
import { PageMetaDto } from '../../../common/dto/page-meta.dto';
import { SummaryDto } from '../../tasks/dto/task-response.dto';

export class AuditLogDto implements AuditLogItem {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ enum: AUDIT_ACTIONS }) action: AuditAction;
  @ApiProperty() entityType: string;
  @ApiProperty({ format: 'uuid', nullable: true, type: String }) entityId: string | null;
  @ApiProperty() summary: string;
  @ApiProperty({ type: SummaryDto, nullable: true }) actor: SummaryDto | null;
  @ApiProperty({ type: Object, nullable: true }) metadata: Record<string, unknown> | null;
  @ApiProperty({ format: 'date-time' }) createdAt: string;
}

export class PaginatedAuditDto implements Paginated<AuditLogItem> {
  @ApiProperty({ type: [AuditLogDto] }) data: AuditLogDto[];
  @ApiProperty({ type: PageMetaDto }) meta: PageMetaDto;
}
