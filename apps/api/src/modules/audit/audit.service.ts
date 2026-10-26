import { Injectable } from '@nestjs/common';
import {
  AUDIT_CATEGORIES,
  type AuditAction,
  type AuditLogItem,
  BUSINESS_TIME_ZONE,
  type Paginated,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { pageArgs, pageMeta } from '../../common/dto/pagination-query.dto';
import { zonedRangeBounds } from '../../common/time/zoned-date';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { ListAuditQueryDto } from './dto/audit-query.dto';

export interface AuditActor {
  organizationId: string;
  /** `null` para ações do sistema. */
  actorId: string | null;
}

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /** Frase legível em português, com os nomes no momento da ação. */
  summary: string;
  /** Detalhes estruturados — nunca senhas, tokens ou dados sensíveis. */
  metadata?: Prisma.InputJsonObject;
}

type Client = PrismaService | Prisma.TransactionClient;

export function actorOf(auth: TenantAuthContext): AuditActor {
  return { organizationId: auth.organization.id, actorId: auth.user.id };
}

/**
 * Trilha de auditoria. `record` aceita o cliente da transação da própria ação, para que o
 * registro só exista se a ação for concluída (e vice-versa).
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(client: Client, actor: AuditActor, entry: AuditEntry): Promise<void> {
    await client.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorId: actor.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary.slice(0, 300),
        metadata: entry.metadata,
      },
    });
  }

  async list(auth: TenantAuthContext, query: ListAuditQueryDto): Promise<Paginated<AuditLogItem>> {
    const filters: Prisma.AuditLogWhereInput[] = [{ organizationId: auth.organization.id }];
    if (query.category) filters.push({ action: { in: [...AUDIT_CATEGORIES[query.category]] } });
    if (query.actorId) filters.push({ actorId: query.actorId });
    if (query.from && query.to) {
      filters.push({
        createdAt: zonedRangeBounds({ from: query.from, to: query.to }, BUSINESS_TIME_ZONE),
      });
    }
    const where: Prisma.AuditLogWhereInput = { AND: filters };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...pageArgs(query),
      }),
    ]);

    return {
      data: logs.map((log) => ({
        id: log.id,
        action: log.action as AuditAction,
        entityType: log.entityType,
        entityId: log.entityId,
        summary: log.summary,
        actor: log.actor,
        metadata: (log.metadata as Record<string, unknown> | null) ?? null,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: pageMeta(query, total),
    };
  }
}
