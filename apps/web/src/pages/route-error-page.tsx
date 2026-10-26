import { RefreshCw, ServerCrash } from 'lucide-react';
import { Link, useRouteError } from 'react-router';
import { FullPageError } from '@/components/full-page-state';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { paths } from '@/lib/navigation';
import { routeErrorMessage } from '@/lib/route-errors';

function useReportedRouteError(): unknown {
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  return error;
}

/** Captura erros de renderização e de carregamento fora do layout da aplicação. */
export function RouteErrorPage() {
  const error = useReportedRouteError();
  return (
    <FullPageError
      title="Algo deu errado"
      message={routeErrorMessage(error)}
      onRetry={() => window.location.reload()}
    />
  );
}

/** Erro em uma tela da aplicação: a sidebar e a topbar continuam disponíveis. */
export function PageErrorBoundary() {
  const error = useReportedRouteError();
  return (
    <Empty className="min-h-[60vh]" role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <ServerCrash />
        </EmptyMedia>
        <EmptyTitle>Algo deu errado</EmptyTitle>
        <EmptyDescription>{routeErrorMessage(error)}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw />
          Recarregar
        </Button>
        <Button asChild variant="outline">
          <Link to={paths.dashboard} reloadDocument>
            Ir para o dashboard
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
