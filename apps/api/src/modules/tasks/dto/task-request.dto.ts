import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  TASK_DUE_FILTERS,
  TASK_LIMITS,
  TASK_PRIORITIES,
  TASK_SORTS,
  TASK_STATUS_FILTERS,
  TASK_STATUSES,
  type TaskDueFilter,
  type TaskPriority,
  type TaskSort,
  type TaskStatus,
  type TaskStatusFilter,
} from '@nexus/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  IsoDate,
  OptionalText,
  OptionalUuid,
  TrimmedText,
} from '../../../common/validation/decorators';

const ASSIGNEE_FILTER_PATTERN =
  /^(me|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export class CreateTaskDto {
  @ApiProperty({ example: 'Enviar proposta revisada', maxLength: TASK_LIMITS.title })
  @TrimmedText('o título da tarefa', 2, TASK_LIMITS.title)
  title: string;

  @ApiPropertyOptional({ nullable: true })
  @OptionalText('a descrição', TASK_LIMITS.description)
  description?: string | null;

  @ApiProperty({ format: 'date', example: '2026-11-05', description: 'Prazo (AAAA-MM-DD).' })
  @IsoDate('Informe um prazo válido.')
  dueDate: string;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(TASK_PRIORITIES, { message: 'Prioridade inválida.' })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Responsável. Omitido: o próprio usuário. Outro membro exige tasks:assign.',
  })
  @OptionalUuid('Responsável inválido.')
  assigneeId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Cliente visível ao usuário.',
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

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES, { message: 'Status inválido.' })
  status?: TaskStatus;
}

export class ListTasksQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Título da tarefa.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Busca muito longa.' })
  search?: string;

  @ApiPropertyOptional({
    enum: TASK_STATUS_FILTERS,
    default: 'open',
    description: '`open` = a fazer e em andamento.',
  })
  @IsOptional()
  @IsIn(TASK_STATUS_FILTERS, { message: 'Status inválido.' })
  status: TaskStatusFilter = 'open';

  @ApiPropertyOptional({
    enum: TASK_DUE_FILTERS,
    description: 'Prazo, considerando apenas tarefas pendentes.',
  })
  @IsOptional()
  @IsIn(TASK_DUE_FILTERS, { message: 'Filtro de prazo inválido.' })
  due?: TaskDueFilter;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsIn(TASK_PRIORITIES, { message: 'Prioridade inválida.' })
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: '`me` ou o ID (UUID) de um membro.' })
  @IsOptional()
  @Matches(ASSIGNEE_FILTER_PATTERN, { message: 'Filtro de responsável inválido.' })
  assignee?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Cliente inválido.' })
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('all', { message: 'Negócio inválido.' })
  dealId?: string;

  @ApiPropertyOptional({ enum: TASK_SORTS, default: 'due' })
  @IsOptional()
  @IsIn(TASK_SORTS, { message: 'Ordenação inválida.' })
  sort: TaskSort = 'due';
}
