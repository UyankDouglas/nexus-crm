import type {
  OrganizationMemberItem,
  OrganizationSummary,
  UpdateOrganizationInput,
} from '@nexus/shared';
import { apiClient } from './api-client';

export const organizationService = {
  getCurrent: (signal?: AbortSignal) =>
    apiClient.get<OrganizationSummary>('/organizations/current', { signal }),
  updateCurrent: (input: UpdateOrganizationInput) =>
    apiClient.patch<OrganizationSummary>('/organizations/current', input),
  listMembers: (signal?: AbortSignal) =>
    apiClient.get<OrganizationMemberItem[]>('/organizations/current/members', { signal }),
};
