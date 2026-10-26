import { Injectable } from '@nestjs/common';
import type { ActivityItem, Paginated } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { pageArgs, pageMeta } from '../../common/dto/pagination-query.dto';
import { AppException } from '../../common/errors/app.exception';
import { resolveLinks } from '../../common/tenancy/linked-records';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { activityInclude, toActivityItem } from './activity.mapper';
import { activityScope, canDeleteOthersActivities } from './activity-scope';
import type {
  CreateActivityDto,
  ListActivitiesQueryDto,
  UpdateActivityDto,
} from './dto/activity-request.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    auth: TenantAuthContext,
    query: ListActivitiesQueryDto,
  ): Promise<Paginated<ActivityItem>> {
    const where: Prisma.ActivityWhereInput = {
      AND: [activityScope(auth), ...this.filters(auth, query)],
    };
    const [total, activities] = await this.prisma.$transaction([
      this.prisma.activity.count({ where }),
      this.prisma.activity.findMany({
        where,
        include: activityInclude,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        ...pageArgs(query),
      }),
    ]);
    return { data: activities.map(toActivityItem), meta: pageMeta(query, total) };
  }

  async get(auth: TenantAuthContext, id: string): Promise<ActivityItem> {
    const activity = await this.prisma.activity.findFirst({
      where: { AND: [activityScope(auth), { id }] },
      include: activityInclude,
    });
    if (!activity) throw this.notFound();
    return toActivityItem(activity);
  }

  /** Registra a interação no histórico do cliente (e do negócio, quando informado). */
  async create(auth: TenantAuthContext, dto: CreateActivityDto): Promise<ActivityItem> {
    if (!dto.customerId && !dto.dealId) {
      throw AppException.validation({
        customerId: ['Vincule a atividade a um cliente ou negócio.'],
      });
    }
    const links = await resolveLinks(this.prisma, auth, dto);

    const activity = await this.prisma.activity.create({
      data: {
        organizationId: auth.organization.id,
        type: dto.type,
        subject: dto.subject,
        description: dto.description ?? null,
        occurredAt: new Date(dto.occurredAt),
        customerId: links.customerId!,
        dealId: links.dealId,
        authorId: auth.user.id,
      },
      include: activityInclude,
    });
    return toActivityItem(activity);
  }

  /** Somente o autor altera o próprio registro — o histórico não é reescrito por terceiros. */
  async update(auth: TenantAuthContext, id: string, dto: UpdateActivityDto): Promise<ActivityItem> {
    const existing = await this.findInScope(auth, id);
    if (existing.authorId !== auth.user.id) {
      throw AppException.forbidden('Somente quem registrou a atividade pode editá-la.');
    }

    const activity = await this.prisma.activity.update({
      where: { organizationId_id: { organizationId: auth.organization.id, id } },
      data: {
        type: dto.type,
        subject: dto.subject,
        description: dto.description,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : undefined,
      },
      include: activityInclude,
    });
    return toActivityItem(activity);
  }

  /** O autor exclui o próprio registro; gestores e administradores excluem qualquer um. */
  async remove(auth: TenantAuthContext, id: string): Promise<void> {
    const existing = await this.findInScope(auth, id);
    if (existing.authorId !== auth.user.id && !canDeleteOthersActivities(auth)) {
      throw AppException.forbidden(
        'Somente quem registrou a atividade ou a gestão pode excluí-la.',
      );
    }
    await this.prisma.activity.delete({
      where: { organizationId_id: { organizationId: auth.organization.id, id } },
    });
  }

  private filters(
    auth: TenantAuthContext,
    query: ListActivitiesQueryDto,
  ): Prisma.ActivityWhereInput[] {
    const filters: Prisma.ActivityWhereInput[] = [];
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      filters.push({ OR: [{ subject: contains }, { description: contains }] });
    }
    if (query.type) filters.push({ type: query.type });
    if (query.customerId) filters.push({ customerId: query.customerId });
    if (query.dealId) filters.push({ dealId: query.dealId });
    if (query.author) {
      filters.push({ authorId: query.author === 'me' ? auth.user.id : query.author });
    }
    return filters;
  }

  private async findInScope(auth: TenantAuthContext, id: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { AND: [activityScope(auth), { id }] },
      select: { id: true, authorId: true },
    });
    if (!activity) throw this.notFound();
    return activity;
  }

  private notFound(): AppException {
    return AppException.notFound('Atividade não encontrada.');
  }
}
