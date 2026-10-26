import { Injectable } from '@nestjs/common';
import {
  addDays,
  BUSINESS_TIME_ZONE,
  OPEN_TASK_STATUSES,
  type Paginated,
  type TaskItem,
  type TaskStats,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { pageArgs, pageMeta } from '../../common/dto/pagination-query.dto';
import { AppException } from '../../common/errors/app.exception';
import { resolveLinks } from '../../common/tenancy/linked-records';
import { assertActiveMember } from '../../common/tenancy/members';
import { zonedIsoDate } from '../../common/time/zoned-date';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { fromIsoDate } from '../deals/deal.mapper';
import type { CreateTaskDto, ListTasksQueryDto, UpdateTaskDto } from './dto/task-request.dto';
import { canAssignTasks, taskScope } from './task-scope';
import { taskInclude, toTaskItem } from './task.mapper';

const DAY_MS = 24 * 60 * 60 * 1000;

const ORDER_BY: Record<ListTasksQueryDto['sort'], Prisma.TaskOrderByWithRelationInput[]> = {
  due: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
  priority: [{ priority: 'desc' }, { dueDate: 'asc' }, { id: 'asc' }],
  recent: [{ createdAt: 'desc' }, { id: 'desc' }],
};

const openStatus: Prisma.TaskWhereInput = { status: { in: [...OPEN_TASK_STATUSES] } };

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(auth: TenantAuthContext, query: ListTasksQueryDto): Promise<Paginated<TaskItem>> {
    const where: Prisma.TaskWhereInput = { AND: [taskScope(auth), ...this.filters(auth, query)] };
    const [total, tasks] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy: ORDER_BY[query.sort],
        ...pageArgs(query),
      }),
    ]);
    return { data: tasks.map(toTaskItem), meta: pageMeta(query, total) };
  }

  /** Pendências do escopo do usuário, com o "hoje" do fuso de negócio. */
  async stats(auth: TenantAuthContext): Promise<TaskStats> {
    const scope = taskScope(auth);
    const today = this.today();
    const [open, overdue, dueToday, completedLast7Days] = await this.prisma.$transaction([
      this.prisma.task.count({ where: { AND: [scope, openStatus] } }),
      this.prisma.task.count({ where: { AND: [scope, openStatus, { dueDate: { lt: today } }] } }),
      this.prisma.task.count({ where: { AND: [scope, openStatus, { dueDate: today }] } }),
      this.prisma.task.count({
        where: {
          AND: [scope, { status: 'DONE', completedAt: { gte: new Date(Date.now() - 7 * DAY_MS) } }],
        },
      }),
    ]);
    return { open, overdue, dueToday, completedLast7Days };
  }

  async get(auth: TenantAuthContext, id: string): Promise<TaskItem> {
    const task = await this.prisma.task.findFirst({
      where: { AND: [taskScope(auth), { id }] },
      include: taskInclude,
    });
    if (!task) throw this.notFound();
    return toTaskItem(task);
  }

  async create(auth: TenantAuthContext, dto: CreateTaskDto): Promise<TaskItem> {
    const assigneeId = dto.assigneeId ?? auth.user.id;
    await this.assertCanAssign(auth, assigneeId);
    const links = await resolveLinks(this.prisma, auth, dto);

    const task = await this.prisma.task.create({
      data: {
        organizationId: auth.organization.id,
        title: dto.title,
        description: dto.description ?? null,
        dueDate: fromIsoDate(dto.dueDate)!,
        priority: dto.priority ?? 'MEDIUM',
        assigneeId,
        customerId: links.customerId,
        dealId: links.dealId,
        createdById: auth.user.id,
      },
      include: taskInclude,
    });
    return toTaskItem(task);
  }

  /**
   * Edita a tarefa e/ou muda o status. Concluir registra a data de conclusão; voltar a uma
   * situação pendente (ou cancelar) a remove. Vínculos só são revalidados quando mudam.
   */
  async update(auth: TenantAuthContext, id: string, dto: UpdateTaskDto): Promise<TaskItem> {
    const existing = await this.findInScope(auth, id);
    const data: Prisma.TaskUncheckedUpdateInput = {
      title: dto.title,
      description: dto.description,
      dueDate: dto.dueDate ? fromIsoDate(dto.dueDate)! : undefined,
      priority: dto.priority,
    };

    if (dto.assigneeId === null) {
      throw AppException.validation({ assigneeId: ['Selecione o responsável.'] });
    }
    if (dto.assigneeId && dto.assigneeId !== existing.assigneeId) {
      await this.assertCanAssign(auth, dto.assigneeId);
      data.assigneeId = dto.assigneeId;
    }

    const next = {
      customerId: dto.customerId !== undefined ? dto.customerId : existing.customerId,
      dealId: dto.dealId !== undefined ? dto.dealId : existing.dealId,
    };
    if (next.customerId !== existing.customerId || next.dealId !== existing.dealId) {
      const links = await resolveLinks(this.prisma, auth, next);
      data.customerId = links.customerId;
      data.dealId = links.dealId;
    }

    if (dto.status && dto.status !== existing.status) {
      data.status = dto.status;
      data.completedAt = dto.status === 'DONE' ? new Date() : null;
    }

    const task = await this.prisma.task.update({
      where: { organizationId_id: { organizationId: auth.organization.id, id } },
      data,
      include: taskInclude,
    });
    return toTaskItem(task);
  }

  async remove(auth: TenantAuthContext, id: string): Promise<void> {
    await this.findInScope(auth, id);
    await this.prisma.task.delete({
      where: { organizationId_id: { organizationId: auth.organization.id, id } },
    });
  }

  private filters(auth: TenantAuthContext, query: ListTasksQueryDto): Prisma.TaskWhereInput[] {
    const filters: Prisma.TaskWhereInput[] = [];
    if (query.search) filters.push({ title: { contains: query.search, mode: 'insensitive' } });

    if (query.status === 'open') filters.push(openStatus);
    else if (query.status !== 'all') filters.push({ status: query.status });

    if (query.due) {
      const today = this.today();
      filters.push(openStatus);
      if (query.due === 'overdue') filters.push({ dueDate: { lt: today } });
      else if (query.due === 'today') filters.push({ dueDate: today });
      else {
        const lastDay = fromIsoDate(addDays(today.toISOString().slice(0, 10), 6))!;
        filters.push({ dueDate: { gte: today, lte: lastDay } });
      }
    }

    if (query.priority) filters.push({ priority: query.priority });
    if (query.assignee) {
      filters.push({ assigneeId: query.assignee === 'me' ? auth.user.id : query.assignee });
    }
    if (query.customerId) filters.push({ customerId: query.customerId });
    if (query.dealId) filters.push({ dealId: query.dealId });
    return filters;
  }

  private async assertCanAssign(auth: TenantAuthContext, assigneeId: string): Promise<void> {
    if (assigneeId !== auth.user.id && !canAssignTasks(auth)) {
      throw AppException.forbidden(
        'Somente gestores e administradores atribuem tarefas a outros membros.',
      );
    }
    await assertActiveMember(this.prisma, auth.organization.id, assigneeId, 'assigneeId');
  }

  private async findInScope(auth: TenantAuthContext, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { AND: [taskScope(auth), { id }] },
      select: { id: true, status: true, assigneeId: true, customerId: true, dealId: true },
    });
    if (!task) throw this.notFound();
    return task;
  }

  /** "Hoje" no fuso de negócio, como data de calendário (meia-noite UTC, igual ao banco). */
  private today(): Date {
    return fromIsoDate(zonedIsoDate(new Date(), BUSINESS_TIME_ZONE))!;
  }

  private notFound(): AppException {
    return AppException.notFound('Tarefa não encontrada.');
  }
}
