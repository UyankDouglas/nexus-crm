import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  DEAL_LIMITS,
  DEAL_SORTS,
  DEAL_STATUSES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type DealSort,
  type DealStatus,
} from '@nexus/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  OptionalIsoDate,
  OptionalText,
  OptionalUuid,
  TrimmedText,
} from '../../../common/validation/decorators';

const OWNER_FILTER_PATTERN =
  /^(me|none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const trimOrNull = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || null : value;

export class CreateDealDto {
  @ApiProperty({ example: 'Renovação do contrato anual', maxLength: DEAL_LIMITS.title })
  @TrimmedText('o nome do negócio', 2, DEAL_LIMITS.title)
  title: string;

  @ApiProperty({ format: 'uuid', description: 'Cliente visível ao usuário.' })
  @IsUUID('all', { message: 'Selecione o cliente.' })
  customerId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Etapa inicial (aberta). Padrão: primeira etapa do funil padrão.',
  })
  @OptionalUuid('Etapa inválida.')
  stageId?: string | null;

  @ApiProperty({ example: 48500.0, minimum: 0, description: 'Valor potencial em reais.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Informe um valor com até 2 casas decimais.' })
  @Min(0, { message: 'O valor não pode ser negativo.' })
  @Max(DEAL_LIMITS.maxValue, { message: 'Valor muito alto.' })
  value: number;

  @ApiPropertyOptional({ format: 'date', nullable: true, example: '2026-12-15' })
  @OptionalIsoDate()
  expectedCloseDate?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Responsável. Omitido: o próprio usuário. Outro valor exige deals:assign.',
  })
  @OptionalUuid('Responsável inválido.')
  ownerId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @OptionalText('as observações', DEAL_LIMITS.notes)
  notes?: string | null;
}

/** Etapa e status mudam somente por `POST /deals/:id/move`. */
export class UpdateDealDto extends PartialType(OmitType(CreateDealDto, ['stageId'] as const)) {}

export class MoveDealDto {
  @ApiProperty({ format: 'uuid', description: 'Etapa de destino (do mesmo funil).' })
  @IsUUID('all', { message: 'Etapa inválida.' })
  stageId: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Posiciona após este negócio da etapa de destino; nulo ou omitido = topo.',
  })
  @OptionalUuid('Posição inválida.')
  afterDealId?: string | null;

  @ApiPropertyOptional({ description: 'Obrigatório ao mover para uma etapa de perda.' })
  @Transform(trimOrNull)
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Descreva o motivo com pelo menos 3 caracteres.' })
  @MaxLength(DEAL_LIMITS.lostReason, {
    message: `O motivo deve ter no máximo ${DEAL_LIMITS.lostReason} caracteres.`,
  })
  lostReason?: string | null;
}

export class BoardQueryDto {
  @ApiPropertyOptional({ description: 'Nome do negócio ou do cliente.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Busca muito longa.' })
  search?: string;

  @ApiPropertyOptional({ description: '`me`, `none` ou o ID (UUID) de um usuário.' })
  @IsOptional()
  @Matches(OWNER_FILTER_PATTERN, { message: 'Filtro de responsável inválido.' })
  owner?: string;
}

export class ListDealsQueryDto extends BoardQueryDto {
  @ApiPropertyOptional({ enum: DEAL_STATUSES })
  @IsOptional()
  @IsIn(DEAL_STATUSES, { message: 'Status inválido.' })
  status?: DealStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Cliente inválido.' })
  customerId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Página inválida.' })
  @Min(1, { message: 'Página inválida.' })
  page: number = 1;

  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, minimum: 1, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tamanho de página inválido.' })
  @Min(1, { message: 'Tamanho de página inválido.' })
  @Max(MAX_PAGE_SIZE, { message: `Use no máximo ${MAX_PAGE_SIZE} itens por página.` })
  pageSize: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ enum: DEAL_SORTS, default: 'recent' })
  @IsOptional()
  @IsIn(DEAL_SORTS, { message: 'Ordenação inválida.' })
  sort: DealSort = 'recent';
}
