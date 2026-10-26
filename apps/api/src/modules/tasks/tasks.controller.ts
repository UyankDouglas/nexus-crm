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
import type { Paginated, TaskItem, TaskStats } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { CurrentTenant, RequirePermissions } from '../../common/auth/auth.decorators';
import { uuidParam } from '../../common/pipes/uuid-param.pipe';
import { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './dto/task-request.dto';
import { PaginatedTasksDto, TaskDto, TaskStatsDto } from './dto/task-response.dto';
import { TasksService } from './tasks.service';

const taskId = uuidParam('Tarefa não encontrada.');

/**
 * Tarefas da organização ativa. Vendedores veem e atualizam apenas as tarefas sob sua
 * responsabilidade; fora do escopo, a resposta é 404.
 */
@ApiTags('Tarefas')
@ApiCookieAuth('session')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Lista tarefas com busca, filtros de status e prazo e paginação' })
  @ApiOkResponse({ type: PaginatedTasksDto })
  list(
    @CurrentTenant() auth: TenantAuthContext,
    @Query() query: ListTasksQueryDto,
  ): Promise<Paginated<TaskItem>> {
    return this.tasks.list(auth, query);
  }

  @Get('stats')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Totais de tarefas pendentes, atrasadas, do dia e concluídas' })
  @ApiOkResponse({ type: TaskStatsDto })
  stats(@CurrentTenant() auth: TenantAuthContext): Promise<TaskStats> {
    return this.tasks.stats(auth);
  }

  @Get(':taskId')
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Detalhes de uma tarefa' })
  @ApiOkResponse({ type: TaskDto })
  @ApiNotFoundResponse()
  get(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('taskId', taskId) id: string,
  ): Promise<TaskItem> {
    return this.tasks.get(auth, id);
  }

  @Post()
  @RequirePermissions('tasks:create')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Cria uma tarefa (para outro membro, exige tasks:assign)' })
  @ApiCreatedResponse({ type: TaskDto })
  @ApiForbiddenResponse({ description: 'Atribuir a outro membro sem permissão.' })
  create(@CurrentTenant() auth: TenantAuthContext, @Body() dto: CreateTaskDto): Promise<TaskItem> {
    return this.tasks.create(auth, dto);
  }

  @Patch(':taskId')
  @RequirePermissions('tasks:update')
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Edita a tarefa ou altera o status' })
  @ApiOkResponse({ type: TaskDto })
  update(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('taskId', taskId) id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskItem> {
    return this.tasks.update(auth, id, dto);
  }

  @Delete(':taskId')
  @RequirePermissions('tasks:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiSecurity('csrf')
  @ApiOperation({ summary: 'Exclui uma tarefa (gestores e administradores)' })
  @ApiNoContentResponse()
  remove(
    @CurrentTenant() auth: TenantAuthContext,
    @Param('taskId', taskId) id: string,
  ): Promise<void> {
    return this.tasks.remove(auth, id);
  }
}
