import type {
  ContactInput,
  ContactItem,
  CustomerDetail,
  CustomerInput,
  CustomerListItem,
  CustomerSort,
  CustomerStats,
  CustomerStatus,
  CustomerType,
  CustomerUpdateInput,
  Paginated,
} from '@nexus/shared';
import { apiClient } from './api-client';

export interface CustomerListParams {
  search?: string;
  status?: CustomerStatus;
  type?: CustomerType;
  /** `me`, `none` ou o ID de um usuário. */
  owner?: string;
  tag?: string;
  page: number;
  pageSize: number;
  sort: CustomerSort;
}

function toQueryString(params: CustomerListParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export const customerService = {
  list: (params: CustomerListParams, signal?: AbortSignal) =>
    apiClient.get<Paginated<CustomerListItem>>(`/customers?${toQueryString(params)}`, { signal }),
  get: (id: string, signal?: AbortSignal) =>
    apiClient.get<CustomerDetail>(`/customers/${id}`, { signal }),
  create: (input: CustomerInput) => apiClient.post<CustomerDetail>('/customers', input),
  update: (id: string, input: CustomerUpdateInput) =>
    apiClient.patch<CustomerDetail>(`/customers/${id}`, input),
  remove: (id: string) => apiClient.delete<void>(`/customers/${id}`),
  tags: (signal?: AbortSignal) => apiClient.get<string[]>('/customers/tags', { signal }),
  stats: (signal?: AbortSignal) => apiClient.get<CustomerStats>('/customers/stats', { signal }),

  createContact: (customerId: string, input: ContactInput) =>
    apiClient.post<ContactItem>(`/customers/${customerId}/contacts`, input),
  updateContact: (customerId: string, contactId: string, input: Partial<ContactInput>) =>
    apiClient.patch<ContactItem>(`/customers/${customerId}/contacts/${contactId}`, input),
  removeContact: (customerId: string, contactId: string) =>
    apiClient.delete<void>(`/customers/${customerId}/contacts/${contactId}`),
};
