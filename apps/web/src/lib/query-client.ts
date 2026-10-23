import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/services/api-client';
import { queryKeys } from './query-keys';

/**
 * Reações globais a erros de sessão: 401 marca o usuário como deslogado (as rotas
 * protegidas redirecionam para o login) e ORGANIZATION_REQUIRED recarrega o perfil.
 */
function handleSessionError(error: unknown): void {
  if (isApiError(error) && error.status === 401) {
    queryClient.setQueryData(queryKeys.me, null);
  } else if (isApiError(error, 'ORGANIZATION_REQUIRED')) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleSessionError }),
  mutationCache: new MutationCache({ onError: handleSessionError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
