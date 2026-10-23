import type { MemberRole } from './roles.js';

/**
 * Matriz de permissões (RBAC). A API é a fonte da verdade: o frontend usa esta
 * matriz apenas para ocultar ações, nunca para autorizar.
 */
export const PERMISSIONS = {
  'organization:read': ['ADMIN', 'MANAGER', 'SALES'],
  'organization:update': ['ADMIN'],
  'members:read': ['ADMIN', 'MANAGER'],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_LABELS: Record<Permission, string> = {
  'organization:read': 'Visualizar dados da organização',
  'organization:update': 'Alterar dados da organização',
  'members:read': 'Visualizar membros da equipe',
};

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}

export function permissionsForRole(role: MemberRole): Permission[] {
  return ALL_PERMISSIONS.filter((permission) => hasPermission(role, permission));
}
