import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import type { PipelineItem } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { PipelineDto } from './dto/deal-response.dto';
import {
  CreatePipelineDto,
  CreateStageDto,
  RemoveStageQueryDto,
  ReorderStagesDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from './dto/pipeline-settings.dto';
import { PipelineSettingsService } from './pipeline-settings.service';

const pipelineId = uuidParam('Funil não encontrado.');
const stageId = uuidParam('Etapa não encontrada.');

/** Configuração de funis e etapas — somente administradores (`pipelines:manage`). */
@ApiTags('Funil de vendas')
@ApiCookieAuth('session')
@Controller('pipelines')
export class PipelineSettingsController {
  constructor(private readonly settings: PipelineSettingsService) {}

  @Post()
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Cria um funil com as etapas padrão' })
  @ApiCreatedResponse({ type: PipelineDto })
  create(
    @CurrentTenant() auth: TenantAuthContext,
    @Body() dto: CreatePipelineDto,
  ): Promise<PipelineItem> {
    return this.settings.create(auth, dto);
  }

  @Patch(':pipelineId')
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Renomeia o funil ou o define como padrão' })
  @ApiOkResponse({ type: PipelineDto })
  @ApiNotFoundResponse()
  update(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
    @Body() dto: UpdatePipelineDto,
  ): Promise<PipelineItem> {
    return this.settings.update(auth, id, dto);
  }

  @Delete(':pipelineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Exclui um funil sem negócios que não seja o padrão' })
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Funil padrão ou com negócios.' })
  remove(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
  ): Promise<void> {
    return this.settings.remove(auth, id);
  }

  @Post(':pipelineId/stages')
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Adiciona uma etapa em andamento (antes de ganho e perda)' })
  @ApiCreatedResponse({ type: PipelineDto })
  addStage(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
    @Body() dto: CreateStageDto,
  ): Promise<PipelineItem> {
    return this.settings.addStage(auth, id, dto);
  }

  @Put(':pipelineId/stages/order')
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Reordena as etapas em andamento' })
  @ApiOkResponse({ type: PipelineDto })
  reorder(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
    @Body() dto: ReorderStagesDto,
  ): Promise<PipelineItem> {
    return this.settings.reorderStages(auth, id, dto);
  }

  @Patch(':pipelineId/stages/:stageId')
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Renomeia a etapa ou altera a probabilidade' })
  @ApiOkResponse({ type: PipelineDto })
  updateStage(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
    @Param('stageId', stageId) stage: string,
    @Body() dto: UpdateStageDto,
  ): Promise<PipelineItem> {
    return this.settings.updateStage(auth, id, stage, dto);
  }

  @Delete(':pipelineId/stages/:stageId')
  @RequirePermissions('pipelines:manage')
  @ApiSecurity('csrf')
  @ApiOperation({
    summary: 'Exclui uma etapa em andamento',
    description: 'Com negócios na etapa, `moveTo` indica para onde movê-los (com histórico).',
  })
  @ApiOkResponse({ type: PipelineDto })
  @ApiConflictResponse({ description: 'Etapa de encerramento, única etapa ou com negócios.' })
  removeStage(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('pipelineId', pipelineId) id: string,
    @Param('stageId', stageId) stage: string,
    @Query() query: RemoveStageQueryDto,
  ): Promise<PipelineItem> {
    return this.settings.removeStage(auth, id, stage, query.moveTo);
  }
}
