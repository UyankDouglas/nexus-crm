import { Injectable } from '@nestjs/common';
import {
  MEMBER_ROLES,
  ROLE_LABELS,
  type MemberRole,
  type OrganizationMemberItem,
  type OrganizationSummary,
} from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import { randomBytes } from 'node:crypto';
import { slugify } from '../../common/utils/slug';
import type { Prisma } from '../../generated/prisma/client';
import { createDefaultPipeline } from '../deals/default-pipeline';
import { PrismaService } from '../../prisma/prisma.service';
import { actorOf, AuditService } from '../audit/audit.service';
import type { UpdateMemberDto, UpdateOrganizationDto } from './dto/organization.dto';

/**
 * Regras de organização. Todo método recebe o `organizationId` do contexto autenticado
 * (sessão), nunca de parâmetros enviados pelo cliente.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createWithAdmin(
    tx: Prisma.TransactionClient,
    input: { name: string; adminUserId: string },
  ): Promise<{ id: string }> {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug: await this.generateUniqueSlug(tx, input.name),
        members: { create: { userId: input.adminUserId, role: 'ADMIN' } },
      },
      select: { id: true },
    });
    await createDefaultPipeline(tx, organization.id);
    return organization;
  }

  async getSummary(organizationId: string): Promise<OrganizationSummary> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!organization) throw AppException.notFound('Organização não encontrada.');

    const groups = await this.prisma.organizationMember.groupBy({
      by: ['role'],
      where: { organizationId, status: 'ACTIVE' },
      _count: { _all: true },
    });

    const membersByRole = Object.fromEntries(MEMBER_ROLES.map((role) => [role, 0])) as Record<
      MemberRole,
      number
    >;
    for (const group of groups) membersByRole[group.role] = group._count._all;

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
      memberCount: Object.values(membersByRole).reduce((total, count) => total + count, 0),
      membersByRole,
    };
  }

  async update(auth: TenantAuthContext, dto: UpdateOrganizationDto): Promise<OrganizationSummary> {
    const organizationId = auth.organization.id;
    await this.prisma.$transaction(async (tx) => {
      const previous = await tx.organization.findUniqueOrThrow({
        where: { id: organizationId },
        select: { name: true },
      });
      await tx.organization.update({ where: { id: organizationId }, data: { name: dto.name } });
      if (previous.name !== dto.name) {
        await this.audit.record(tx, actorOf(auth), {
          action: 'organization.updated',
          entityType: 'organization',
          entityId: organizationId,
          summary: `Nome da organização alterado de "${previous.name}" para "${dto.name}".`,
          metadata: { name: { from: previous.name, to: dto.name } },
        });
      }
    });
    return this.getSummary(organizationId);
  }

  async listMembers(organizationId: string): Promise<OrganizationMemberItem[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: memberInclude,
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
    });
    return members.map(toMemberItem);
  }

  /**
   * Altera o perfil e/ou suspende ou reativa um membro. Ninguém altera o próprio vínculo, e a
   * organização nunca fica sem um administrador ativo. A suspensão vale na próxima requisição:
   * o AuthGuard revalida o vínculo a cada chamada.
   */
  async updateMember(
    auth: TenantAuthContext,
    userId: string,
    dto: UpdateMemberDto,
  ): Promise<OrganizationMemberItem> {
    const organizationId = auth.organization.id;
    if (userId === auth.user.id) {
      throw AppException.conflict(
        'Você não pode alterar o próprio perfil nem suspender o próprio acesso.',
      );
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const current = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        include: memberInclude,
      });
      if (!current) throw AppException.notFound('Membro não encontrado.');

      const role = dto.role ?? current.role;
      const status = dto.status ?? current.status;
      const losesAdmin =
        current.role === 'ADMIN' &&
        current.status === 'ACTIVE' &&
        (role !== 'ADMIN' || status !== 'ACTIVE');
      if (losesAdmin) {
        const otherAdmins = await tx.organizationMember.count({
          where: { organizationId, role: 'ADMIN', status: 'ACTIVE', userId: { not: userId } },
        });
        if (otherAdmins === 0) {
          throw AppException.conflict(
            'A organização precisa de pelo menos um administrador ativo.',
          );
        }
      }

      const updated = await tx.organizationMember.update({
        where: { id: current.id },
        data: { role, status },
        include: memberInclude,
      });

      const actor = actorOf(auth);
      const name = current.user.name;
      if (role !== current.role) {
        await this.audit.record(tx, actor, {
          action: 'member.role_changed',
          entityType: 'member',
          entityId: userId,
          summary: `Perfil de ${name} alterado de ${ROLE_LABELS[current.role]} para ${ROLE_LABELS[role]}.`,
          metadata: { role: { from: current.role, to: role } },
        });
      }
      if (status !== current.status) {
        await this.audit.record(tx, actor, {
          action: status === 'SUSPENDED' ? 'member.suspended' : 'member.reactivated',
          entityType: 'member',
          entityId: userId,
          summary:
            status === 'SUSPENDED' ? `Acesso de ${name} suspenso.` : `Acesso de ${name} reativado.`,
          metadata: { status: { from: current.status, to: status } },
        });
      }
      return updated;
    });

    return toMemberItem(member);
  }

  private async generateUniqueSlug(tx: Prisma.TransactionClient, name: string): Promise<string> {
    const base = slugify(name);
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
      const taken = await tx.organization.count({ where: { slug: candidate } });
      if (!taken) return candidate;
    }
    return `${base}-${randomBytes(4).toString('hex')}`;
  }
}

const memberInclude = {
  user: { select: { id: true, name: true, email: true, lastLoginAt: true } },
} satisfies Prisma.OrganizationMemberInclude;

type MemberWithUser = Prisma.OrganizationMemberGetPayload<{ include: typeof memberInclude }>;

function toMemberItem(member: MemberWithUser): OrganizationMemberItem {
  return {
    membershipId: member.id,
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    role: member.role,
    status: member.status,
    joinedAt: member.createdAt.toISOString(),
    lastLoginAt: member.user.lastLoginAt?.toISOString() ?? null,
  };
}
