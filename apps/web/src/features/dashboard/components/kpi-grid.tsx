import type { CustomerStats } from '@nexus/shared';
import {
  ArrowRight,
  CircleDollarSign,
  CircleX,
  Handshake,
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
import { paths } from '@/lib/navigation';

interface PendingKpi {
  label: string;
  icon: LucideIcon;
  /** Módulo que passará a alimentar o indicador com dados reais. */
  source: string;
}

const PENDING_KPIS: PendingKpi[] = [
  { label: 'Oportunidades abertas', icon: Handshake, source: 'Funil de vendas · Fase 3' },
  { label: 'Negociações ganhas', icon: Trophy, source: 'Funil de vendas · Fase 3' },
  { label: 'Negociações perdidas', icon: CircleX, source: 'Funil de vendas · Fase 3' },
  { label: 'Valor total do pipeline', icon: Wallet, source: 'Funil de vendas · Fase 3' },
  {
    label: 'Receita de negócios ganhos',
    icon: CircleDollarSign,
    source: 'Funil de vendas · Fase 3',
  },
  { label: 'Taxa de conversão', icon: Percent, source: 'Dashboard · Fase 4' },
];

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

function KpiCard({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Card size="sm" className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Grade definitiva dos indicadores comerciais. Indicadores cujos módulos já existem mostram
 * dados reais (respeitando a carteira de cada perfil); os demais informam de onde virão os
 * dados — nenhum número fictício é exibido.
 */
export function KpiGrid({ customerStats }: { customerStats: CustomerStats | undefined }) {
  return (
    <section aria-labelledby="kpis-title" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="kpis-title" className="text-sm font-semibold text-foreground">
          Indicadores comerciais
        </h2>
        <p className="text-xs text-muted-foreground">
          Calculados a partir dos dados reais da organização conforme os módulos forem lançados.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <li>
          <KpiCard label="Total de clientes" icon={Users}>
            {customerStats ? (
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {customerStats.total}
              </p>
            ) : (
              <Skeleton className="h-8 w-16" />
            )}
            <Link
              to={paths.customers}
              className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {customerStats
                ? `${plural(customerStats.byStatus.LEAD, 'lead', 'leads')} · ${plural(customerStats.byStatus.ACTIVE, 'ativo', 'ativos')}`
                : 'Ver clientes'}
              <ArrowRight className="size-3" />
            </Link>
          </KpiCard>
        </li>
        {PENDING_KPIS.map((kpi) => (
          <li key={kpi.label}>
            <KpiCard label={kpi.label} icon={kpi.icon}>
              <p className="text-2xl font-semibold tracking-tight text-muted-foreground/60">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Sem dados</span>
              </p>
              <Badge variant="outline" className="mt-auto w-fit font-normal text-muted-foreground">
                {kpi.source}
              </Badge>
            </KpiCard>
          </li>
        ))}
      </ul>
    </section>
  );
}
