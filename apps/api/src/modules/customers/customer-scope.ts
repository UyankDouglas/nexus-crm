import { hasPermission } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import type { Prisma } from '../../generated/prisma/client';

/**
 * Escopo de visibilidade de clientes: sempre a organização ativa e, para perfis sem
 * `customers:read-all` (vendedores), apenas os clientes dos quais o usuário é responsável.
 * Todo acesso a clientes — inclusive por ID — passa por este filtro.
 */
export function customerScope(auth: TenantAuthContext): Prisma.CustomerWhereInput {
  const scope: Prisma.CustomerWhereInput = { organizationId: auth.organization.id };
  return canViewAllCustomers(auth) ? scope : { ...scope, ownerId: auth.user.id };
}

export function canViewAllCustomers(auth: TenantAuthContext): boolean {
  return hasPermission(auth.membership.role, 'customers:read-all');
}

export function canAssignCustomers(auth: TenantAuthContext): boolean {
  return hasPermission(auth.membership.role, 'customers:assign');
}
