import { hasPermission } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import type { Prisma } from '../../generated/prisma/client';

/**
 * Escopo de visibilidade de tarefas: organização ativa e, para perfis sem `tasks:read-all`
 * (vendedores), somente as tarefas sob sua responsabilidade. Combine sempre com `AND`.
 */
export function taskScope(auth: TenantAuthContext): Prisma.TaskWhereInput {
  const scope: Prisma.TaskWhereInput = { organizationId: auth.organization.id };
  return hasPermission(auth.membership.role, 'tasks:read-all')
    ? scope
    : { ...scope, assigneeId: auth.user.id };
}

export function canAssignTasks(auth: TenantAuthContext): boolean {
  return hasPermission(auth.membership.role, 'tasks:assign');
}
