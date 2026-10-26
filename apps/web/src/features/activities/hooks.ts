import type { ActivityInput, ActivityUpdateInput } from '@nexus/shared';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { type ActivityListParams, activityService } from '@/services/activities.service';

export function useActivities(params: ActivityListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.activities.list(params),
    queryFn: ({ signal }) => activityService.list(params, signal),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** Linha do tempo com "carregar mais" (histórico de um cliente ou negócio). */
export function useActivityFeed(params: Omit<ActivityListParams, 'page'>) {
  return useInfiniteQuery({
    queryKey: queryKeys.activities.feed(params),
    queryFn: ({ pageParam, signal }) =>
      activityService.list({ ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  });
}

function useInvalidateActivities() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
}

export function useCreateActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    mutationFn: (input: ActivityInput) => activityService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateActivity() {
  const invalidate = useInvalidateActivities();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ActivityUpdateInput }) =>
      activityService.update(id, input),
    onSuccess: invalidate,
  });
}

/** `onDeleted` roda no hook: continua valendo mesmo se a tela que pediu a exclusão sair. */
export function useDeleteActivity(onDeleted?: (id: string) => void) {
  const invalidate = useInvalidateActivities();
  return useMutation({
    mutationFn: (id: string) => activityService.remove(id),
    onSuccess: (_data, id) => {
      onDeleted?.(id);
      return invalidate();
    },
  });
}
