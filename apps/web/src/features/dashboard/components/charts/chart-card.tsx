import { ChartNoAxesColumn } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description: string;
  action?: ReactNode;
  /** `undefined` enquanto carrega; `true` mostra o estado vazio no lugar do gráfico. */
  empty?: boolean;
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
  children: ReactNode;
}

/** Moldura padrão dos gráficos do dashboard, com carregamento e estado vazio. */
export function ChartCard({
  title,
  description,
  action,
  empty = false,
  emptyMessage = 'Ainda não há dados para o período selecionado.',
  loading = false,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="flex-1">
        {loading ? (
          <Skeleton className="h-60 w-full rounded-lg" />
        ) : empty ? (
          <Empty className="h-60 border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ChartNoAxesColumn />
              </EmptyMedia>
              <EmptyTitle>Sem dados</EmptyTitle>
              <EmptyDescription>{emptyMessage}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
