import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DashboardSummary } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { DashboardSummaryDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiCookieAuth('session')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @RequirePermissions('organization:read')
  @ApiOperation({
    summary: 'Indicadores, séries e rankings do painel inicial',
    description:
      'Carteira, pipeline e tarefas refletem o momento atual; resultados, vendas por período, ' +
      'desempenho e distribuição consideram o intervalo informado (máximo de 731 dias). ' +
      'Tudo respeita o escopo do usuário: vendedores veem apenas a própria carteira.',
  })
  @ApiOkResponse({ type: DashboardSummaryDto })
  summary(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: DashboardQueryDto,
  ): Promise<DashboardSummary> {
    return this.dashboard.summary(auth, query);
  }
}
