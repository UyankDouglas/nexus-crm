import { hasPermission } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import type { Prisma } from '../../generated/prisma/client';

/**
 * Escopo de visibilidade de negócios: organização ativa e, para perfis sem `deals:read-all`
 * (vendedores), apenas os negócios dos quais o usuário é responsável. Combine sempre com `AND`.
 */
export function dealScope(auth: TenantAuthContext): Prisma.DealWhereInput {
  const scope: Prisma.DealWhereInput = { organizationId: auth.organization.id };
  return hasPermission(auth.membership.role, 'deals:read-all')
    ? scope
    : { ...scope, ownerId: auth.user.id };
}

export function canAssignDeals(auth: TenantAuthContext): boolean {
  return hasPermission(auth.membership.role, 'deals:assign');
}

export function canReopenDeals(auth: TenantAuthContext): boolean {
  return hasPermission(auth.membership.role, 'deals:reopen');
}
