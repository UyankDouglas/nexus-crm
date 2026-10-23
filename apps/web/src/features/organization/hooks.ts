import type { MeResponse, UpdateOrganizationInput } from '@nexus/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/features/auth/hooks';
import { queryKeys } from '@/lib/query-keys';
import { organizationService } from '@/services/organization.service';

export function useOrganizationSummary() {
  return useQuery({
    queryKey: queryKeys.organization,
    queryFn: ({ signal }) => organizationService.getCurrent(signal),
  });
}

/** Lista de membros — só é buscada quando o perfil tem a permissão `members:read`. */
export function useOrganizationMembers() {
  const canReadMembers = usePermission('members:read');
  return useQuery({
    queryKey: queryKeys.organizationMembers,
    queryFn: ({ signal }) => organizationService.listMembers(signal),
    enabled: canReadMembers,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) => organizationService.updateCurrent(input),
    onSuccess: (summary) => {
      queryClient.setQueryData(queryKeys.organization, summary);
      // Mantém o nome exibido na sidebar e nos menus sincronizado.
      queryClient.setQueryData<MeResponse | null>(queryKeys.me, (me) =>
        me?.activeOrganization
          ? {
              ...me,
              activeOrganization: { ...me.activeOrganization, name: summary.name },
              memberships: me.memberships.map((membership) =>
                membership.organizationId === summary.id
                  ? { ...membership, organizationName: summary.name }
                  : membership,
              ),
            }
          : me,
      );
    },
  });
}
