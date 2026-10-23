import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type {
  DealBoard,
  DealDetail,
  DealListItem,
  DealStats,
  Paginated,
  PipelineItem,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { DealsService } from './deals.service';
import {
  BoardQueryDto,
  CreateDealDto,
  ListDealsQueryDto,
  MoveDealDto,
  UpdateDealDto,
} from './dto/deal-request.dto';
import {
  DealBoardDto,
  DealDetailDto,
  DealStatsDto,
  PaginatedDealsDto,
  PipelineDto,
} from './dto/deal-response.dto';

const pipelineId = uuidParam('Funil não encontrado.');
const dealId = uuidParam('Negócio não encontrado.');

@ApiTags('Funil de vendas')
@ApiCookieAuth('session')
@Controller('pipelines')
export class PipelinesController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Funis da organização com as etapas em ordem' })
  @ApiOkResponse({ type: [PipelineDto] })
  list(@CurrentTenant() auth: TenantAuthContext): Promise<PipelineItem[]> {
    return this.deals.listPipelines(auth);
  }

  @Get(':pipelineId/board')
  @RequirePermissions('deals:read')
  @ApiOperation({
    summary: 'Quadro Kanban do funil',
    description:
      'Negócios em andamento e encerrados nos últimos 30 dias, por etapa, respeitando a carteira do usuário.',
  })
  @ApiOkResponse({ type: DealBoardDto })
  @ApiNotFoundResponse()
  board(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
    @Query() query: BoardQueryDto,
  ): Promise<DealBoard> {
    return this.deals.board(auth, id, query);
  }
}

/**
 * Negócios da organização ativa. Vendedores operam apenas sobre os próprios negócios; fora do
 * escopo, a resposta é 404.
 */
@ApiTags('Negócios')
@ApiCookieAuth('session')
@Controller('deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Lista negócios com busca, filtros, ordenação e paginação' })
  @ApiOkResponse({ type: PaginatedDealsDto })
  list(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ListDealsQueryDto,
  ): Promise<Paginated<DealListItem>> {
    return this.deals.list(auth, query);
  }

  @Get('stats')
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Indicadores de negócios (abertos, ganhos, perdidos e conversão)' })
  @ApiOkResponse({ type: DealStatsDto })
  stats(@CurrentTenant() auth: TenantAuthContext): Promise<DealStats> {
    return this.deals.stats(auth);
  }

  @Get(':dealId')
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Detalhes do negócio com o histórico de movimentações' })
  @ApiOkResponse({ type: DealDetailDto })
  @ApiNotFoundResponse()
  get(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('dealId', dealId) id: string,
  ): Promise<DealDetail> {
    return this.deals.get(auth, id);
  }

  @Post()
  @RequirePermissions('deals:create')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Cadastra um negócio' })
  @ApiCreatedResponse({ type: DealDetailDto })
  create(
    @CurrentTenant() auth: TenantAuthContext,
    @Body() dto: CreateDealDto,
  ): Promise<DealDetail> {
    return this.deals.create(auth, dto);
  }

  @Patch(':dealId')
  @RequirePermissions('deals:update')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Atualiza os dados de um negócio em andamento' })
  @ApiOkResponse({ type: DealDetailDto })
  update(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('dealId', dealId) id: string,
    @Body() dto: UpdateDealDto,
  ): Promise<DealDetail> {
    return this.deals.update(auth, id, dto);
  }

  @Post(':dealId/move')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('deals:update')
  @ApiSecurity('csrf')
  @ApiOperation({
    summary: 'Move o negócio para outra etapa ou posição',
    description:
      'Etapas de ganho e perda encerram o negócio (perda exige motivo). Reabrir exige deals:reopen.',
  })
  @ApiOkResponse({ type: DealDetailDto })
  @ApiForbiddenResponse({ description: 'Reabrir negócio encerrado sem permissão.' })
  move(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('dealId', dealId) id: string,
    @Body() dto: MoveDealDto,
  ): Promise<DealDetail> {
    return this.deals.move(auth, id, dto);
  }

  @Delete(':dealId')
  @RequirePermissions('deals:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Exclui um negócio e seu histórico (gestores e administradores)' })
  @ApiNoContentResponse()
  remove(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('dealId', dealId) id: string,
  ): Promise<void> {
    return this.deals.remove(auth, id);
  }
}
