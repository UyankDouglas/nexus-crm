import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { ACTIVITY_LIMITS, ACTIVITY_TYPES, type ActivityType } from '@nexus/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  OptionalText,
  OptionalUuid,
  PastDateTime,
  TrimmedText,
} from '../../../common/validation/decorators';

const AUTHOR_FILTER_PATTERN =
  /^(me|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export class CreateActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn(ACTIVITY_TYPES, { message: 'Selecione o tipo de atividade.' })
  type: ActivityType;

  @ApiProperty({ example: 'Alinhamento da proposta', maxLength: ACTIVITY_LIMITS.subject })
  @TrimmedText('o assunto', 2, ACTIVITY_LIMITS.subject)
  subject: string;

  @ApiPropertyOptional({ nullable: true })
  @OptionalText('a descrição', ACTIVITY_LIMITS.description)
  description?: string | null;

  @ApiProperty({
    format: 'date-time',
    description: 'Quando a interação aconteceu (não pode estar no futuro).',
  })
  @PastDateTime()
  occurredAt: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Cliente visível ao usuário. Obrigatório se não houver negócio.',
  })
  @OptionalUuid('Cliente inválido.')
  customerId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Negócio visível ao usuário. O cliente passa a ser o do negócio.',
  })
  @OptionalUuid('Negócio inválido.')
  dealId?: string | null;
}

/** O vínculo com cliente e negócio é definido no registro e não muda depois. */
export class UpdateActivityDto extends PartialType(
  OmitType(CreateActivityDto, ['customerId', 'dealId'] as const),
) {}

export class ListActivitiesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Assunto ou descrição.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Busca muito longa.' })
  search?: string;

  @ApiPropertyOptional({ enum: ACTIVITY_TYPES })
  @IsOptional()
  @IsIn(ACTIVITY_TYPES, { message: 'Tipo inválido.' })
  type?: ActivityType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Cliente inválido.' })
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Negócio inválido.' })
  dealId?: string;

  @ApiPropertyOptional({ description: '`me` ou o ID (UUID) de um membro.' })
  @IsOptional()
  @Matches(AUTHOR_FILTER_PATTERN, { message: 'Filtro de autor inválido.' })
  author?: string;
}
