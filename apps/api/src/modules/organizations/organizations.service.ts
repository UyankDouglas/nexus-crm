import { Injectable } from '@nestjs/common';
import {
  MEMBER_ROLES,
  type MemberRole,
  type OrganizationMemberItem,
  type OrganizationSummary,
} from '@nexus/shared';
import { AppException } from '../../common/errors/app.exception';
import { randomBytes } from 'node:crypto';
import { slugify } from '../../common/utils/slug';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateOrganizationDto } from './dto/organization.dto';

/**
 * Regras de organização. Todo método recebe o `organizationId` do contexto autenticado
 * (sessão), nunca de parâmetros enviados pelo cliente.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithAdmin(
    tx: Prisma.TransactionClient,
    input: { name: string; adminUserId: string },
  ): Promise<{ id: string }> {
    return tx.organization.create({
      data: {
        name: input.name,
        slug: await this.generateUniqueSlug(tx, input.name),
        members: { create: { userId: input.adminUserId, role: 'ADMIN' } },
      },
      select: { id: true },
    });
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

  async update(organizationId: string, dto: UpdateOrganizationDto): Promise<OrganizationSummary> {
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { name: dto.name },
    });
    return this.getSummary(organizationId);
  }

  async listMembers(organizationId: string): Promise<OrganizationMemberItem[]> {
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
    });

    return members.map((member) => ({
      membershipId: member.id,
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      status: member.status,
      joinedAt: member.createdAt.toISOString(),
      lastLoginAt: member.user.lastLoginAt?.toISOString() ?? null,
    }));
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
