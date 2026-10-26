import type { DashboardSummary } from '@nexus/shared';
import {
  ArrowRight,
  CircleDollarSign,
  CircleX,
  Handshake,
  ListChecks,
  type LucideIcon,
  Percent,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/format';
import { paths } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  icon: Icon,
  tone = 'bg-primary/10 text-primary',
  children,
}: {
  label: string;
  icon: LucideIcon;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={cn('flex size-8 items-center justify-center rounded-lg', tone)}>
            <Icon className="size-4" />
          </span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function KpiValue({ value, title }: { value: string | undefined; title?: string }) {
  if (value === undefined) return <Skeleton className="h-8 w-20" />;
  return (
    <p className="text-2xl font-semibold tracking-tight tabular-nums" title={title}>
      {value}
    </p>
  );
}

function KpiLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {children}
      <ArrowRight className="size-3" />
    </Link>
  );
}

export function KpiHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('mt-auto text-xs text-muted-foreground', className)}>{children}</p>;
}

interface KpiGridProps {
  summary: DashboardSummary | undefined;
  /** Rótulo do período selecionado (ex.: "Últimos 90 dias"). */
  periodLabel: string;
}

/**
 * Indicadores comerciais calculados pela API sobre os dados reais e o escopo do usuário.
 * Carteira, pipeline e tarefas são a situação atual; resultados seguem o período escolhido.
 */
export function KpiGrid({ summary, periodLabel }: KpiGridProps) {
  const results = summary?.results;
  return (
    <section aria-labelledby="kpis-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kpis-title" className="text-sm font-semibold text-foreground">
          Indicadores comerciais
        </h2>
        <p className="text-xs text-muted-foreground">
          Resultados de {periodLabel.toLowerCase()} · carteira e pipeline na situação atual
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <li>
          <KpiCard label="Total de clientes" icon={Users}>
            <KpiValue value={summary && String(summary.customers.total)} />
            <KpiLink to={paths.customers}>Ver clientes</KpiLink>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Oportunidades abertas" icon={Handshake}>
            <KpiValue value={summary && String(summary.pipeline.openCount)} />
            <KpiLink to={paths.pipeline}>Ver funil de vendas</KpiLink>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Valor total do pipeline" icon={Wallet}>
            <KpiValue
              value={summary && formatCurrencyCompact(summary.pipeline.openValue)}
              title={summary && formatCurrency(summary.pipeline.openValue)}
            />
            <KpiHint>Soma dos negócios em andamento</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Taxa de conversão" icon={Percent} tone="bg-warning/15 text-warning">
            <KpiValue
              value={
                results &&
                (results.conversionRate === null ? '—' : formatPercent(results.conversionRate))
              }
            />
            <KpiHint>
              {results?.conversionRate === null
                ? 'Sem negócios encerrados no período'
                : 'Ganhos sobre encerrados no período'}
            </KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Negociações ganhas" icon={Trophy} tone="bg-success/15 text-success">
            <KpiValue value={results && String(results.wonCount)} />
            <KpiHint>{periodLabel}</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard
            label="Receita de negócios ganhos"
            icon={CircleDollarSign}
            tone="bg-success/15 text-success"
          >
            <KpiValue
              value={results && formatCurrencyCompact(results.wonValue)}
              title={results && formatCurrency(results.wonValue)}
            />
            <KpiHint>{periodLabel}</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard
            label="Negociações perdidas"
            icon={CircleX}
            tone="bg-destructive/10 text-destructive"
          >
            <KpiValue value={results && String(results.lostCount)} />
            <KpiHint>{periodLabel}</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Tarefas pendentes" icon={ListChecks}>
            <KpiValue value={summary && String(summary.tasks.open)} />
            {summary && summary.tasks.overdue > 0 ? (
              <KpiLink to={`${paths.tasks}?due=overdue`}>
                {summary.tasks.overdue} {summary.tasks.overdue === 1 ? 'atrasada' : 'atrasadas'}
              </KpiLink>
            ) : (
              <KpiLink to={paths.tasks}>Ver tarefas</KpiLink>
            )}
          </KpiCard>
        </li>
      </ul>
    </section>
  );
}
