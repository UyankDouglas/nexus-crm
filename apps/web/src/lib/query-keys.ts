/** Chaves centralizadas do TanStack Query. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  organization: ['organization', 'current'] as const,
  organizationMembers: ['organization', 'current', 'members'] as const,
};
