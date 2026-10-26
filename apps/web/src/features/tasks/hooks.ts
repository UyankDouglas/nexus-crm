import type { TaskUpdateInput } from '@nexus/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { type TaskCreateInput, type TaskListParams, taskService } from '@/services/tasks.service';

export function useTasks(params: TaskListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.list(params),
    queryFn: ({ signal }) => taskService.list(params, signal),
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: queryKeys.tasks.stats,
    queryFn: ({ signal }) => taskService.stats(signal),
  });
}

/** Tarefas alimentam listas, totais, notificações e o dashboard. */
function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
    ]);
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: TaskCreateInput) => taskService.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TaskUpdateInput }) =>
      taskService.update(id, input),
    onSuccess: invalidate,
  });
}

/** `onDeleted` roda no hook: continua valendo mesmo se a tela que pediu a exclusão sair. */
export function useDeleteTask(onDeleted?: (id: string) => void) {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.remove(id),
    onSuccess: (_data, id) => {
      onDeleted?.(id);
      return invalidate();
    },
  });
}
