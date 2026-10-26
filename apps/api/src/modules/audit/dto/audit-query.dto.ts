import { ApiPropertyOptional } from '@nestjs/swagger';
import { AUDIT_CATEGORIES, type AuditCategory } from '@nexus/shared';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OptionalIsoDate } from '../../../common/validation/decorators';

const CATEGORIES = Object.keys(AUDIT_CATEGORIES) as AuditCategory[];

export class ListAuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CATEGORIES })
  @IsOptional()
  @IsIn(CATEGORIES, { message: 'Categoria inválida.' })
  category?: AuditCategory;

  @ApiPropertyOptional({ format: 'uuid', description: 'Quem executou a ação.' })
  @IsOptional()
  @IsUUID('all', { message: 'Membro inválido.' })
  actorId?: string;

  @ApiPropertyOptional({ format: 'date', description: 'Início do período (com `to`).' })
  @OptionalIsoDate()
  from?: string | null;

  @ApiPropertyOptional({ format: 'date', description: 'Fim do período, inclusive.' })
  @OptionalIsoDate()
  to?: string | null;
}
