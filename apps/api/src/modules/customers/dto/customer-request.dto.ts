import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import {
  BRAZILIAN_STATES,
  CONTACT_LIMITS,
  CUSTOMER_LIMITS,
  CUSTOMER_SORTS,
  CUSTOMER_STATUSES,
  CUSTOMER_TYPES,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type BrazilianState,
  type CustomerSort,
  type CustomerStatus,
  type CustomerType,
} from '@nexus/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  OptionalDocument,
  OptionalEmail,
  OptionalPhone,
  OptionalText,
  OptionalUrl,
  OptionalUuid,
  Tags,
  TrimmedText,
} from '../../../common/validation/decorators';

/** `me`, `none` ou um UUID. */
const OWNER_FILTER_PATTERN =
  /^(me|none|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export class CreateCustomerDto {
  @ApiProperty({ enum: CUSTOMER_TYPES, description: 'Não pode ser alterado depois do cadastro.' })
  @IsIn(CUSTOMER_TYPES, { message: 'Tipo de cliente inválido.' })
  type: CustomerType;

  @ApiProperty({ example: 'Aurora Distribuidora Ltda', maxLength: CUSTOMER_LIMITS.name })
  @TrimmedText('o nome', 2, CUSTOMER_LIMITS.name)
  name: string;

  @ApiPropertyOptional({ nullable: true, example: 'Aurora Distribuidora' })
  @OptionalText('o nome fantasia', CUSTOMER_LIMITS.tradeName)
  tradeName?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'CPF (pessoa física) ou CNPJ (empresa), com ou sem pontuação. Aceita CNPJ alfanumérico.',
    example: '11.222.333/0001-81',
  })
  @OptionalDocument()
  document?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'Empresa à qual a pessoa física está vinculada.',
  })
  @OptionalUuid('Empresa inválida.')
  companyId?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'contato@aurora.example' })
  @OptionalEmail()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true, example: '(11) 98765-4321' })
  @OptionalPhone()
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'https://aurora.example' })
  @OptionalUrl()
  website?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'São Paulo' })
  @OptionalText('a cidade', CUSTOMER_LIMITS.city)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true, enum: BRAZILIAN_STATES })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() || null : value,
  )
  @IsOptional()
  @IsIn(BRAZILIAN_STATES, { message: 'UF inválida.' })
  state?: BrazilianState | null;

  @ApiPropertyOptional({ enum: CUSTOMER_STATUSES, default: 'LEAD' })
  @IsOptional()
  @IsIn(CUSTOMER_STATUSES, { message: 'Status inválido.' })
  status?: CustomerStatus;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description:
      'Responsável comercial. Omitido: o próprio usuário. `null` (sem responsável) ou outro usuário exigem a permissão customers:assign.',
  })
  @OptionalUuid('Responsável inválido.')
  ownerId?: string | null;

  @ApiPropertyOptional({ type: [String], example: ['Varejo', 'Grande conta'] })
  @Tags()
  tags?: string[];

  @ApiPropertyOptional({ nullable: true })
  @OptionalText('as observações', CUSTOMER_LIMITS.notes)
  notes?: string | null;
}

/** Atualização parcial. O tipo do cliente é imutável. */
export class UpdateCustomerDto extends PartialType(
  OmitType(CreateCustomerDto, ['type'] as const),
) {}

export class ListCustomersQueryDto {
  @ApiPropertyOptional({ description: 'Nome, nome fantasia, e-mail, telefone ou documento.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Busca muito longa.' })
  search?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_STATUSES })
  @IsOptional()
  @IsIn(CUSTOMER_STATUSES, { message: 'Status inválido.' })
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CUSTOMER_TYPES })
  @IsOptional()
  @IsIn(CUSTOMER_TYPES, { message: 'Tipo inválido.' })
  type?: CustomerType;

  @ApiPropertyOptional({ description: '`me`, `none` ou o ID (UUID) de um usuário.' })
  @IsOptional()
  @Matches(OWNER_FILTER_PATTERN, { message: 'Filtro de responsável inválido.' })
  owner?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(CUSTOMER_LIMITS.tagLength)
  tag?: string;

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

  @ApiPropertyOptional({ enum: CUSTOMER_SORTS, default: 'name' })
  @IsOptional()
  @IsIn(CUSTOMER_SORTS, { message: 'Ordenação inválida.' })
  sort: CustomerSort = 'name';
}

export class CreateContactDto {
  @ApiProperty({ example: 'Paula Ramos' })
  @TrimmedText('o nome', 2, CONTACT_LIMITS.name)
  name: string;

  @ApiPropertyOptional({ nullable: true })
  @OptionalEmail()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @OptionalPhone()
  phone?: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'Gerente de compras' })
  @OptionalText('o cargo', CONTACT_LIMITS.position)
  position?: string | null;

  @ApiPropertyOptional({ default: false, description: 'Contato principal do cliente.' })
  @IsOptional()
  @IsBoolean({ message: 'Valor inválido.' })
  isPrimary?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @OptionalText('as observações', CONTACT_LIMITS.notes)
  notes?: string | null;
}

export class UpdateContactDto extends PartialType(CreateContactDto) {}
