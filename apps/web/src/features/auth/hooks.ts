import type { LoginInput, MeResponse, Permission, RegisterInput } from '@nexus/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { isApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';

/** Usuário autenticado. `null` quando não há sessão válida. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: async ({ signal }): Promise<MeResponse | null> => {
      try {
        return await authService.me(signal);
      } catch (error) {
        if (isApiError(error) && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Versão para rotas protegidas, onde o usuário já foi garantido pelo ProtectedRoute. */
export function useCurrentUser(): MeResponse {
  const { data } = useMe();
  if (!data) throw new Error('useCurrentUser deve ser usado dentro de uma rota protegida.');
  return data;
}

/** Atalho para checar permissões na UI (apenas visual — a API sempre valida). */
export function usePermission(permission: Permission): boolean {
  const { data } = useMe();
  return data?.activeOrganization?.permissions.includes(permission) ?? false;
}

/**
 * Ao trocar de sessão ou organização, descarta todo o cache para que nenhum dado de
 * outra organização permaneça visível.
 */
function useSessionReset() {
  const queryClient = useQueryClient();
  return (me: MeResponse | null) => {
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== queryKeys.me[0] });
    queryClient.setQueryData(queryKeys.me, me);
  };
}

export function useLogin() {
  const resetSession = useSessionReset();
  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: resetSession,
  });
}

export function useRegister() {
  const resetSession = useSessionReset();
  return useMutation({
    mutationFn: (input: RegisterInput) => authService.register(input),
    onSuccess: resetSession,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await authService.logout();
      } catch (error) {
        // Sessão já inválida no servidor: o resultado para o usuário é o mesmo.
        if (!isApiError(error) || error.status !== 401) throw error;
      }
    },
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(queryKeys.me, null);
    },
  });
}

export function useSwitchOrganization() {
  const resetSession = useSessionReset();
  return useMutation({
    mutationFn: (organizationId: string) => authService.switchOrganization(organizationId),
    onSuccess: resetSession,
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authService.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authService.resetPassword });
}
