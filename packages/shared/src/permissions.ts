import type { MemberRole } from './roles.js';

/**
 * Matriz de permissões (RBAC). A API é a fonte da verdade: o frontend usa esta
 * matriz apenas para ocultar ações, nunca para autorizar.
 */
export const PERMISSIONS = {
  'organization:read': ['ADMIN', 'MANAGER', 'SALES'],
  'organization:update': ['ADMIN'],
  'members:read': ['ADMIN', 'MANAGER'],
  // Clientes: vendedores operam apenas sobre os clientes dos quais são responsáveis.
  'customers:read': ['ADMIN', 'MANAGER', 'SALES'],
  'customers:read-all': ['ADMIN', 'MANAGER'],
  'customers:create': ['ADMIN', 'MANAGER', 'SALES'],
  'customers:update': ['ADMIN', 'MANAGER', 'SALES'],
  'customers:assign': ['ADMIN', 'MANAGER'],
  'customers:delete': ['ADMIN', 'MANAGER'],
  // Negócios: mesma lógica de carteira; reabrir encerrados é decisão da gestão.
  'deals:read': ['ADMIN', 'MANAGER', 'SALES'],
  'deals:read-all': ['ADMIN', 'MANAGER'],
  'deals:create': ['ADMIN', 'MANAGER', 'SALES'],
  'deals:update': ['ADMIN', 'MANAGER', 'SALES'],
  'deals:assign': ['ADMIN', 'MANAGER'],
  'deals:reopen': ['ADMIN', 'MANAGER'],
  'deals:delete': ['ADMIN', 'MANAGER'],
  // Tarefas: vendedores veem e atualizam as tarefas sob sua responsabilidade.
  'tasks:read': ['ADMIN', 'MANAGER', 'SALES'],
  'tasks:read-all': ['ADMIN', 'MANAGER'],
  'tasks:create': ['ADMIN', 'MANAGER', 'SALES'],
  'tasks:update': ['ADMIN', 'MANAGER', 'SALES'],
  'tasks:assign': ['ADMIN', 'MANAGER'],
  'tasks:delete': ['ADMIN', 'MANAGER'],
  // Atividades: o histórico de interações acompanha a carteira; só o autor edita o registro.
  'activities:read': ['ADMIN', 'MANAGER', 'SALES'],
  'activities:read-all': ['ADMIN', 'MANAGER'],
  'activities:create': ['ADMIN', 'MANAGER', 'SALES'],
  'activities:delete': ['ADMIN', 'MANAGER'],
} as const satisfies Record<string, readonly MemberRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export const PERMISSION_LABELS: Record<Permission, string> = {
  'organization:read': 'Visualizar dados da organização',
  'organization:update': 'Alterar dados da organização',
  'members:read': 'Visualizar membros da equipe',
  'customers:read': 'Visualizar clientes',
  'customers:read-all': 'Visualizar clientes de toda a equipe',
  'customers:create': 'Cadastrar clientes',
  'customers:update': 'Editar clientes e contatos',
  'customers:assign': 'Distribuir clientes entre vendedores',
  'customers:delete': 'Excluir clientes',
  'deals:read': 'Visualizar negócios',
  'deals:read-all': 'Visualizar negócios de toda a equipe',
  'deals:create': 'Cadastrar negócios',
  'deals:update': 'Editar e movimentar negócios',
  'deals:assign': 'Distribuir negócios entre vendedores',
  'deals:reopen': 'Reabrir negócios encerrados',
  'deals:delete': 'Excluir negócios',
  'tasks:read': 'Visualizar tarefas',
  'tasks:read-all': 'Visualizar tarefas de toda a equipe',
  'tasks:create': 'Criar tarefas',
  'tasks:update': 'Editar tarefas e alterar status',
  'tasks:assign': 'Atribuir tarefas a outros membros',
  'tasks:delete': 'Excluir tarefas',
  'activities:read': 'Visualizar o histórico de atividades',
  'activities:read-all': 'Visualizar atividades de toda a equipe',
  'activities:create': 'Registrar ligações, reuniões e observações',
  'activities:delete': 'Excluir atividades de outros membros',
};

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly MemberRole[]).includes(role);
}

export function permissionsForRole(role: MemberRole): Permission[] {
  return ALL_PERMISSIONS.filter((permission) => hasPermission(role, permission));
}
