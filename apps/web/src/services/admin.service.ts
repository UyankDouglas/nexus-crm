import type {
  AcceptInvitationResponse,
  AuditCategory,
  AuditLogItem,
  InvitationInput,
  InvitationItem,
  InvitationPreview,
  MembershipStatus,
  MemberRole,
  OrganizationMemberItem,
  Paginated,
  PipelineItem,
  StageInput,
} from '@nexus/shared';
import { apiClient } from './api-client';
import { toQueryString } from './query-string';

export interface AuditListParams {
  category?: AuditCategory;
  actorId?: string;
  page: number;
  pageSize: number;
}

export interface AcceptInvitationBody {
  token: string;
  name?: string;
  password?: string;
}

/** Administração da organização ativa: membros, convites, funis e auditoria. */
export const adminService = {
  updateMember: (userId: string, input: { role?: MemberRole; status?: MembershipStatus }) =>
    apiClient.patch<OrganizationMemberItem>(`/organizations/current/members/${userId}`, input),

  invitations: (signal?: AbortSignal) =>
    apiClient.get<InvitationItem[]>('/organizations/current/invitations', { signal }),
  invite: (input: InvitationInput) =>
    apiClient.post<InvitationItem>('/organizations/current/invitations', input),
  resendInvitation: (id: string) =>
    apiClient.post<InvitationItem>(`/organizations/current/invitations/${id}/resend`),
  revokeInvitation: (id: string) =>
    apiClient.delete<void>(`/organizations/current/invitations/${id}`),

  previewInvitation: (token: string) =>
    apiClient.post<InvitationPreview>('/invitations/preview', { token }),
  acceptInvitation: (body: AcceptInvitationBody) =>
    apiClient.post<AcceptInvitationResponse>('/invitations/accept', body),

  createPipeline: (name: string) => apiClient.post<PipelineItem>('/pipelines', { name }),
  updatePipeline: (id: string, input: { name?: string; isDefault?: boolean }) =>
    apiClient.patch<PipelineItem>(`/pipelines/${id}`, input),
  deletePipeline: (id: string) => apiClient.delete<void>(`/pipelines/${id}`),
  addStage: (pipelineId: string, input: StageInput) =>
    apiClient.post<PipelineItem>(`/pipelines/${pipelineId}/stages`, input),
  updateStage: (pipelineId: string, stageId: string, input: Partial<StageInput>) =>
    apiClient.patch<PipelineItem>(`/pipelines/${pipelineId}/stages/${stageId}`, input),
  reorderStages: (pipelineId: string, stageIds: string[]) =>
    apiClient.put<PipelineItem>(`/pipelines/${pipelineId}/stages/order`, { stageIds }),
  deleteStage: (pipelineId: string, stageId: string, moveTo?: string) =>
    apiClient.delete<PipelineItem>(
      `/pipelines/${pipelineId}/stages/${stageId}${toQueryString({ moveTo })}`,
    ),

  audit: (params: AuditListParams, signal?: AbortSignal) =>
    apiClient.get<Paginated<AuditLogItem>>(`/audit${toQueryString(params)}`, { signal }),
};
