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

/** Qualquer alteração em clientes invalida listas, detalhes, tags, totais e o dashboard. */
function useInvalidateCustomers() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
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

/**
 * `onDeleted` roda no hook, antes da limpeza do cache: callbacks passados ao `mutate` se perdem
 * quando a tela que pediu a exclusão é desmontada pela nova busca do registro excluído (404).
 */
export function useDeleteCustomer(onDeleted?: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customerService.remove(id),
    onSuccess: (_data, id) => {
      onDeleted?.(id);
      queryClient.removeQueries({ queryKey: queryKeys.customers.detail(id) });
      // Tarefas e atividades do cliente são excluídas junto com ele.
      return Promise.all(
        [
          queryKeys.customers.all,
          queryKeys.tasks.all,
          queryKeys.activities.all,
          queryKeys.dashboard.all,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
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
