import { ApiProperty, ApiPropertyOptional, IntersectionType } from '@nestjs/swagger';
import {
  CLOSED_DEAL_FILTERS,
  EXPORT_FORMATS,
  REPORT_TYPES,
  type ClosedDealFilter,
  type ExportFormat,
  type ReportType,
} from '@nexus/shared';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { IsoDate } from '../../../common/validation/decorators';

export class ReportPeriodDto {
  @ApiProperty({ format: 'date', example: '2026-01-01' })
  @IsoDate('Informe a data inicial do período.')
  from: string;

  @ApiProperty({ format: 'date', example: '2026-10-26', description: 'Inclusive.' })
  @IsoDate('Informe a data final do período.')
  to: string;
}

export class ClosedDealsFilterDto extends ReportPeriodDto {
  @ApiPropertyOptional({ enum: CLOSED_DEAL_FILTERS, default: 'all' })
  @IsOptional()
  @IsIn(CLOSED_DEAL_FILTERS, { message: 'Filtro inválido.' })
  status: ClosedDealFilter = 'all';
}

export class ClosedDealsQueryDto extends IntersectionType(
  ClosedDealsFilterDto,
  PaginationQueryDto,
) {}

export class ExportReportQueryDto extends ClosedDealsFilterDto {
  @ApiProperty({ enum: REPORT_TYPES })
  @IsIn(REPORT_TYPES, { message: 'Relatório inválido.' })
  type: ReportType;

  @ApiProperty({ enum: EXPORT_FORMATS })
  @IsIn(EXPORT_FORMATS, { message: 'Formato inválido.' })
  format: ExportFormat;
}
