import { isRouteErrorResponse, useRouteError } from 'react-router';
import { FullPageError } from '@/components/full-page-state';

/** Captura erros de renderização e de carregamento de rotas. */
export function RouteErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} — ${error.statusText}`
    : 'Ocorreu um erro inesperado nesta tela. Recarregue a página para continuar.';

  if (import.meta.env.DEV) console.error(error);

  return (
    <FullPageError
      title="Algo deu errado"
      message={message}
      onRetry={() => window.location.reload()}
    />
  );
}
