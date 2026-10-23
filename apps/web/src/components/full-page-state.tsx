import { RefreshCw, ServerCrash } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

export function FullPageLoader({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <LogoMark className="size-10 animate-pulse" />
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner />
        {label}
      </span>
    </div>
  );
}

export function FullPageError({
  title = 'Não foi possível carregar o NEXUS CRM',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <ServerCrash className="size-6" />
      </span>
      <div className="max-w-md space-y-1">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
