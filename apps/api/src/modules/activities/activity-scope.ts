import { hasPermission } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import type { Prisma } from '../../generated/prisma/client';

/**
 * Escopo do histórico de interações. Gestores e administradores veem toda a organização; o
 * vendedor vê o que registrou e tudo o que envolve seus clientes ou negócios — inclusive
 * registros feitos pela gestão. Combine sempre com `AND`.
 */
export function activityScope(auth: TenantAuthContext): Prisma.ActivityWhereInput {
  const scope: Prisma.ActivityWhereInput = { organizationId: auth.organization.id };
  if (hasPermission(auth.membership.role, 'activities:read-all')) return scope;
  return {
    ...scope,
    OR: [
      { authorId: auth.user.id },
      { customer: { ownerId: auth.user.id } },
      { deal: { ownerId: auth.user.id } },
    ],
  };
}

/** Exclusão de registros de outros autores (moderação pela gestão). */
export function canDeleteOthersActivities(auth: TenantAuthContext): boolean {
  return hasPermission(auth.membership.role, 'activities:delete');
}
