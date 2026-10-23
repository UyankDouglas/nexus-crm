import type { CustomerStats, DealStats } from '@nexus/shared';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/format';
import { paths } from '@/lib/navigation';
import { cn } from '@/lib/utils';

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

function KpiCard({
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

function KpiValue({ value, title }: { value: string | undefined; title?: string }) {
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

function KpiHint({ children }: { children: ReactNode }) {
  return <p className="mt-auto text-xs text-muted-foreground">{children}</p>;
}

interface KpiGridProps {
  customerStats: CustomerStats | undefined;
  dealStats: DealStats | undefined;
}

/**
 * Indicadores comerciais calculados pela API sobre os dados reais, respeitando a carteira de
 * cada perfil. O indicador de tarefas informa de onde virão os dados — nenhum número fictício.
 */
export function KpiGrid({ customerStats, dealStats: deals }: KpiGridProps) {
  return (
    <section aria-labelledby="kpis-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kpis-title" className="text-sm font-semibold text-foreground">
          Indicadores comerciais
        </h2>
        <p className="text-xs text-muted-foreground">
          Calculados a partir dos dados reais que você pode acessar.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <li>
          <KpiCard label="Total de clientes" icon={Users}>
            <KpiValue value={customerStats && String(customerStats.total)} />
            <KpiLink to={paths.customers}>
              {customerStats
                ? `${plural(customerStats.byStatus.LEAD, 'lead', 'leads')} · ${plural(customerStats.byStatus.ACTIVE, 'ativo', 'ativos')}`
                : 'Ver clientes'}
            </KpiLink>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Oportunidades abertas" icon={Handshake}>
            <KpiValue value={deals && String(deals.open.count)} />
            <KpiLink to={paths.pipeline}>Ver funil de vendas</KpiLink>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Valor total do pipeline" icon={Wallet}>
            <KpiValue
              value={deals && formatCurrencyCompact(deals.open.value)}
              title={deals && formatCurrency(deals.open.value)}
            />
            <KpiHint>Soma dos negócios em andamento</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Taxa de conversão" icon={Percent} tone="bg-warning/15 text-warning">
            <KpiValue
              value={
                deals && (deals.conversionRate === null ? '—' : formatPercent(deals.conversionRate))
              }
            />
            <KpiHint>
              {deals?.conversionRate === null
                ? 'Sem negócios encerrados ainda'
                : 'Ganhos sobre negócios encerrados'}
            </KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Negociações ganhas" icon={Trophy} tone="bg-success/15 text-success">
            <KpiValue value={deals && String(deals.won.count)} />
            <KpiHint>Encerradas com sucesso</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard
            label="Receita de negócios ganhos"
            icon={CircleDollarSign}
            tone="bg-success/15 text-success"
          >
            <KpiValue
              value={deals && formatCurrencyCompact(deals.won.value)}
              title={deals && formatCurrency(deals.won.value)}
            />
            <KpiHint>Valor dos negócios ganhos</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard
            label="Negociações perdidas"
            icon={CircleX}
            tone="bg-destructive/10 text-destructive"
          >
            <KpiValue value={deals && String(deals.lost.count)} />
            <KpiHint>Motivos registrados em cada negócio</KpiHint>
          </KpiCard>
        </li>
        <li>
          <KpiCard label="Tarefas pendentes" icon={ListChecks}>
            <p className="text-2xl font-semibold tracking-tight text-muted-foreground/60">
              <span aria-hidden="true">—</span>
              <span className="sr-only">Sem dados</span>
            </p>
            <Badge variant="outline" className="mt-auto w-fit font-normal text-muted-foreground">
              Tarefas e atividades · Fase 4
            </Badge>
          </KpiCard>
        </li>
      </ul>
    </section>
  );
}
