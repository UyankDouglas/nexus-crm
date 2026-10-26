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
import type { ActivityItem, Paginated } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { ActivitiesService } from './activities.service';
import {
  CreateActivityDto,
  ListActivitiesQueryDto,
  UpdateActivityDto,
} from './dto/activity-request.dto';
import { ActivityDto, PaginatedActivitiesDto } from './dto/activity-response.dto';

const activityId = uuidParam('Atividade não encontrada.');

/**
 * Histórico de interações (ligações, reuniões, e-mails e observações). O vendedor vê os
 * registros dos próprios clientes e negócios; fora do escopo, a resposta é 404.
 */
@ApiTags('Atividades')
@ApiCookieAuth('session')
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @RequirePermissions('activities:read')
  @ApiOperation({ summary: 'Lista atividades, das mais recentes para as mais antigas' })
  @ApiOkResponse({ type: PaginatedActivitiesDto })
  list(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ListActivitiesQueryDto,
  ): Promise<Paginated<ActivityItem>> {
    return this.activities.list(auth, query);
  }

  @Get(':activityId')
  @RequirePermissions('activities:read')
  @ApiOperation({ summary: 'Detalhes de uma atividade' })
  @ApiOkResponse({ type: ActivityDto })
  @ApiNotFoundResponse()
  get(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('activityId', activityId) id: string,
  ): Promise<ActivityItem> {
    return this.activities.get(auth, id);
  }

  @Post()
  @RequirePermissions('activities:create')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Registra uma ligação, reunião, e-mail ou observação' })
  @ApiCreatedResponse({ type: ActivityDto })
  create(
    @CurrentTenant() auth: TenantAuthContext,
    @Body() dto: CreateActivityDto,
  ): Promise<ActivityItem> {
    return this.activities.create(auth, dto);
  }

  @Patch(':activityId')
  @RequirePermissions('activities:create')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Edita uma atividade (somente o autor)' })
  @ApiOkResponse({ type: ActivityDto })
  @ApiForbiddenResponse({ description: 'Atividade registrada por outro membro.' })
  update(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('activityId', activityId) id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityItem> {
    return this.activities.update(auth, id, dto);
  }

  @Delete(':activityId')
  @RequirePermissions('activities:create')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Exclui uma atividade (o autor ou a gestão)' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Atividade de outro membro, sem activities:delete.' })
  remove(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('activityId', activityId) id: string,
  ): Promise<void> {
    return this.activities.remove(auth, id);
  }
}
