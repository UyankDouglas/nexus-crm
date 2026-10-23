import type { DealInput, DealMoveInput, DealUpdateInput } from '@nexus/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { type BoardParams, type DealListParams, dealService } from '@/services/deals.service';

export function usePipelines() {
  return useQuery({
    queryKey: queryKeys.deals.pipelines,
    queryFn: ({ signal }) => dealService.pipelines(signal),
    staleTime: 5 * 60_000,
  });
}

export function useBoard(pipelineId: string | undefined, params: BoardParams) {
  return useQuery({
    queryKey: queryKeys.deals.board(pipelineId ?? '', params),
    queryFn: ({ signal }) => dealService.board(pipelineId!, params, signal),
    enabled: Boolean(pipelineId),
    placeholderData: keepPreviousData,
  });
}

export function useDeals(params: DealListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.deals.list(params),
    queryFn: ({ signal }) => dealService.list(params, signal),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useDeal(id: string | null) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id ?? ''),
    queryFn: ({ signal }) => dealService.get(id!, signal),
    enabled: Boolean(id),
  });
}

export function useDealStats() {
  return useQuery({
    queryKey: queryKeys.deals.stats,
    queryFn: ({ signal }) => dealService.stats(signal),
  });
}

/** Alterações em negócios invalidam quadro, listas, detalhes e indicadores. */
function useInvalidateDeals() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
}

export function useCreateDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (input: DealInput) => dealService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateDeal(id: string) {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: (input: DealUpdateInput) => dealService.update(id, input),
    onSuccess: invalidate,
  });
}

/** O quadro aplica a mudança de forma otimista; aqui só se confirma e sincroniza com a API. */
export function useMoveDeal() {
  const invalidate = useInvalidateDeals();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: DealMoveInput }) =>
      dealService.move(id, input),
    onSettled: invalidate,
  });
}

/**
 * `onDeleted` roda no hook, antes da limpeza do cache: callbacks passados ao `mutate` se perdem
 * quando a tela que pediu a exclusão é desmontada pela nova busca do registro excluído (404).
 */
export function useDeleteDeal(onDeleted?: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => dealService.remove(id),
    onSuccess: (_data, id) => {
      onDeleted?.(id);
      queryClient.removeQueries({ queryKey: queryKeys.deals.detail(id) });
      return queryClient.invalidateQueries({ queryKey: queryKeys.deals.all });
    },
  });
}
