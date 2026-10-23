import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { paths } from '@/lib/navigation';
import { useLogout } from './hooks';

/** Encerra a sessão no servidor e leva o usuário para a tela de login. */
export function useSignOut() {
  const logout = useLogout();
  const navigate = useNavigate();

  const signOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        void navigate(paths.login, { replace: true });
        toast.success('Você saiu da sua conta.');
      },
      onError: (error) => toast.error(error.message),
    });

  return { signOut, isPending: logout.isPending };
}
