import type { ContactInput, CustomerInput, CustomerUpdateInput } from '@nexus/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { type CustomerListParams, customerService } from '@/services/customers.service';

export function useCustomers(params: CustomerListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: ({ signal }) => customerService.list(params, signal),
    enabled: options.enabled ?? true,
    // Mantém a página anterior visível enquanto a próxima carrega (sem "piscar" a tabela).
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: ({ signal }) => customerService.get(id, signal),
  });
}

export function useCustomerTags() {
  return useQuery({
    queryKey: queryKeys.customers.tags,
    queryFn: ({ signal }) => customerService.tags(signal),
    staleTime: 60_000,
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: queryKeys.customers.stats,
    queryFn: ({ signal }) => customerService.stats(signal),
  });
}

/** Qualquer alteração em clientes invalida listas, detalhes, tags e totais. */
function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
}

export function useCreateCustomer() {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: CustomerInput) => customerService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCustomer(id: string) {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (input: CustomerUpdateInput) => customerService.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customerService.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.customers.detail(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
    },
  });
}

export function useSaveContact(customerId: string) {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: ({ contactId, input }: { contactId?: string; input: Partial<ContactInput> }) =>
      contactId
        ? customerService.updateContact(customerId, contactId, input)
        : customerService.createContact(customerId, input as ContactInput),
    onSuccess: invalidate,
  });
}

export function useDeleteContact(customerId: string) {
  const invalidate = useInvalidateCustomers();
  return useMutation({
    mutationFn: (contactId: string) => customerService.removeContact(customerId, contactId),
    onSuccess: invalidate,
  });
}
