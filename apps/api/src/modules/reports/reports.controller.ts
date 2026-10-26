import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { ClosedDealItem, Paginated, ReportsOverview } from '@nexus/shared';
import type { Response } from 'express';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { ClosedDealsQueryDto, ExportReportQueryDto, ReportPeriodDto } from './dto/report-query.dto';
import { PaginatedClosedDealsDto, ReportsOverviewDto } from './dto/report-response.dto';
import { ReportsService } from './reports.service';

/** Relatórios comerciais — gestores e administradores. */
@ApiTags('Relatórios')
@ApiCookieAuth('session')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('overview')
  @RequirePermissions('reports:read')
  @ApiOperation({
    summary: 'Desempenho por vendedor, receita, pipeline ponderado e motivos de perda',
  })
  @ApiOkResponse({ type: ReportsOverviewDto })
  overview(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ReportPeriodDto,
  ): Promise<ReportsOverview> {
    return this.reports.overview(auth, query);
  }

  @Get('closed-deals')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Negócios ganhos e perdidos no período' })
  @ApiOkResponse({ type: PaginatedClosedDealsDto })
  closedDeals(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ClosedDealsQueryDto,
  ): Promise<Paginated<ClosedDealItem>> {
    return this.reports.closedDeals(auth, query);
  }

  @Get('export')
  @RequirePermissions('reports:export')
  @ApiOperation({
    summary: 'Exporta um relatório em CSV ou Excel',
    description: 'Cada exportação fica registrada na auditoria.',
  })
  @ApiProduces('text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @ApiOkResponse({ description: 'Arquivo para download.' })
  async export(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ExportReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const file = await this.reports.export(auth, query);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return new StreamableFile(file.body);
  }
}
