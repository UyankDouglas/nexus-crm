import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router';
import { FullPageError, FullPageLoader } from '@/components/full-page-state';
import { useMe } from '@/features/auth/hooks';
import { paths } from '@/lib/navigation';
import { safeRedirect } from '@/lib/safe-redirect';

/**
 * Exige sessão válida (e, por padrão, organização ativa). É uma proteção de navegação:
 * a autorização real acontece na API, que valida sessão e vínculo em cada requisição.
 */
export function ProtectedRoute({ requireOrganization = true }: { requireOrganization?: boolean }) {
  const { data: me, isPending, isError, error, refetch } = useMe();
  const location = useLocation();

  if (isPending) return <FullPageLoader />;
  if (isError) return <FullPageError message={error.message} onRetry={() => void refetch()} />;

  if (!me) {
    const redirect = `${location.pathname}${location.search}`;
    const search = redirect === '/' ? '' : `?redirect=${encodeURIComponent(redirect)}`;
    return <Navigate to={`${paths.login}${search}`} replace />;
  }

  if (requireOrganization && !me.activeOrganization) {
    return <Navigate to={paths.selectOrganization} replace />;
  }

  return <Outlet />;
}

/** Páginas públicas de autenticação: usuários já autenticados seguem para o sistema. */
export function GuestRoute() {
  const { data: me, isPending } = useMe();
  const [searchParams] = useSearchParams();

  if (isPending) return <FullPageLoader />;

  if (me) {
    const target = me.activeOrganization
      ? safeRedirect(searchParams.get('redirect'))
      : paths.selectOrganization;
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
