import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { PIPELINE_LIMITS } from '@nexus/shared';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { TrimmedText } from '../../../common/validation/decorators';

export class CreatePipelineDto {
  @ApiProperty({ example: 'Funil de renovações', maxLength: PIPELINE_LIMITS.name })
  @TrimmedText('o nome do funil', 2, PIPELINE_LIMITS.name)
  name: string;
}

export class UpdatePipelineDto {
  @ApiPropertyOptional({ maxLength: PIPELINE_LIMITS.name })
  @IsOptional()
  @TrimmedText('o nome do funil', 2, PIPELINE_LIMITS.name)
  name?: string;

  @ApiPropertyOptional({ description: '`true` torna este o funil padrão da organização.' })
  @IsOptional()
  @IsBoolean({ message: 'Valor inválido.' })
  isDefault?: boolean;
}

export class CreateStageDto {
  @ApiProperty({ example: 'Demonstração', maxLength: PIPELINE_LIMITS.stageName })
  @TrimmedText('o nome da etapa', 2, PIPELINE_LIMITS.stageName)
  name: string;

  @ApiProperty({ minimum: 0, maximum: 100, example: 30 })
  @Type(() => Number)
  @IsInt({ message: 'Use um número inteiro.' })
  @Min(0, { message: 'Use um valor entre 0 e 100.' })
  @Max(100, { message: 'Use um valor entre 0 e 100.' })
  probability: number;
}

export class UpdateStageDto extends PartialType(CreateStageDto) {}

export class ReorderStagesDto {
  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Todas as etapas em andamento, na nova ordem.',
  })
  @IsArray({ message: 'Informe a lista de etapas.' })
  @ArrayMinSize(1, { message: 'Informe a lista de etapas.' })
  @ArrayMaxSize(PIPELINE_LIMITS.maxOpenStages, { message: 'Etapas demais.' })
  @IsUUID('all', { each: true, message: 'Etapa inválida.' })
  stageIds: string[];
}

export class RemoveStageQueryDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Etapa que recebe os negócios da etapa excluída (obrigatória se houver negócios).',
  })
  @IsOptional()
  @IsUUID('all', { message: 'Etapa inválida.' })
  moveTo?: string;
}
