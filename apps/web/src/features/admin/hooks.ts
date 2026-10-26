import type { InvitationInput, StageInput } from '@nexus/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@/features/auth/hooks';
import { queryKeys } from '@/lib/query-keys';
import {
  type AcceptInvitationBody,
  type AuditListParams,
  adminService,
} from '@/services/admin.service';

/** Ações administrativas também atualizam a trilha de auditoria. */
function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: ReadonlyArray<readonly unknown[]>) =>
    Promise.all(
      [...keys, queryKeys.audit.all].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useUpdateMember() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      userId,
      ...input
    }: Parameters<typeof adminService.updateMember>[1] & {
      userId: string;
    }) => adminService.updateMember(userId, input),
    onSuccess: () => invalidate(queryKeys.organizationMembers, queryKeys.organization),
  });
}

export function useInvitations() {
  const canManage = usePermission('members:manage');
  return useQuery({
    queryKey: queryKeys.invitations,
    queryFn: ({ signal }) => adminService.invitations(signal),
    enabled: canManage,
  });
}

export function useInvite() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: InvitationInput) => adminService.invite(input),
    // Mesmo se o e-mail falhar, o convite pode ter sido registrado: a lista é sempre recarregada.
    onSettled: () => invalidate(queryKeys.invitations),
  });
}

export function useResendInvitation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => adminService.resendInvitation(id),
    onSettled: () => invalidate(queryKeys.invitations),
  });
}

export function useRevokeInvitation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => adminService.revokeInvitation(id),
    onSuccess: () => invalidate(queryKeys.invitations),
  });
}

export function useInvitationPreview(token: string | null) {
  return useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () => adminService.previewInvitation(token!),
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AcceptInvitationBody) => adminService.acceptInvitation(body),
    onSuccess: async (result) => {
      // Conta criada: a nova sessão substitui a anterior, então nada do cache pode sobrar.
      if (result.signedIn) {
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] });
      }
      // Recarrega o usuário (mesmo sem observadores) antes de liberar a navegação.
      await queryClient.refetchQueries({ queryKey: queryKeys.me, type: 'all' });
    },
  });
}

/** Mudanças em funis e etapas afetam quadro, formulários e relatórios. */
export function usePipelineSettings() {
  const invalidate = useInvalidate();
  const onSuccess = () => invalidate(queryKeys.deals.all, queryKeys.reports.all);
  return {
    createPipeline: useMutation({ mutationFn: adminService.createPipeline, onSuccess }),
    updatePipeline: useMutation({
      mutationFn: ({ id, ...input }: { id: string; name?: string; isDefault?: boolean }) =>
        adminService.updatePipeline(id, input),
      onSuccess,
    }),
    deletePipeline: useMutation({ mutationFn: adminService.deletePipeline, onSuccess }),
    addStage: useMutation({
      mutationFn: ({ pipelineId, input }: { pipelineId: string; input: StageInput }) =>
        adminService.addStage(pipelineId, input),
      onSuccess,
    }),
    updateStage: useMutation({
      mutationFn: (args: { pipelineId: string; stageId: string; input: Partial<StageInput> }) =>
        adminService.updateStage(args.pipelineId, args.stageId, args.input),
      onSuccess,
    }),
    reorderStages: useMutation({
      mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
        adminService.reorderStages(pipelineId, stageIds),
      onSuccess,
    }),
    deleteStage: useMutation({
      mutationFn: (args: { pipelineId: string; stageId: string; moveTo?: string }) =>
        adminService.deleteStage(args.pipelineId, args.stageId, args.moveTo),
      onSuccess,
    }),
  };
}

export function useAuditLog(params: AuditListParams) {
  const canRead = usePermission('audit:read');
  return useQuery({
    queryKey: queryKeys.audit.list(params),
    queryFn: ({ signal }) => adminService.audit(params, signal),
    enabled: canRead,
    placeholderData: keepPreviousData,
  });
}
