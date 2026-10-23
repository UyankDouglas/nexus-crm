export const MEMBER_ROLES = ['ADMIN', 'MANAGER', 'SALES'] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

export const ROLE_LABELS: Record<MemberRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor Comercial',
  SALES: 'Vendedor',
};

export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  ADMIN: 'Administra a organização, os membros, as permissões e as configurações.',
  MANAGER: 'Acompanha a equipe, distribui oportunidades e consulta relatórios comerciais.',
  SALES: 'Gerencia os próprios clientes, oportunidades, tarefas e metas.',
};

export const MEMBERSHIP_STATUSES = ['ACTIVE', 'SUSPENDED'] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export function isMemberRole(value: unknown): value is MemberRole {
  return typeof value === 'string' && (MEMBER_ROLES as readonly string[]).includes(value);
}
