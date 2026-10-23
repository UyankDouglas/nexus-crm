import type { DealStats } from '@nexus/shared';
import { CircleCheck, CircleX, Loader, Percent } from 'lucide-react';
import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';

interface StatProps {
  label: string;
  value: string;
  hint: string;
  hintTitle?: string;
  icon: ReactNode;
  tone: string;
}

function Stat({ label, value, hint, hintTitle, icon, tone }: StatProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <span
        className={cn(
          'hidden size-9 shrink-0 items-center justify-center rounded-lg sm:flex [&_svg]:size-4',
          tone,
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg leading-tight font-semibold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted-foreground" title={hintTitle}>
          {hint}
        </p>
      </div>
    </div>
  );
}

/** Indicadores reais dos negócios visíveis ao usuário (toda a equipe ou a própria carteira). */
export function DealStatsCards({ stats }: { stats: DealStats | undefined }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[82px] rounded-xl" />
        ))}
      </div>
    );
  }

  const count = (value: number, singular: string, plural: string) =>
    `${value} ${value === 1 ? singular : plural}`;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat
        label="Em andamento"
        value={formatCurrencyCompact(stats.open.value)}
        hint={count(stats.open.count, 'negócio aberto', 'negócios abertos')}
        hintTitle={formatCurrency(stats.open.value)}
        icon={<Loader />}
        tone="bg-primary/10 text-primary"
      />
      <Stat
        label="Ganhos"
        value={formatCurrencyCompact(stats.won.value)}
        hint={count(stats.won.count, 'negócio ganho', 'negócios ganhos')}
        hintTitle={formatCurrency(stats.won.value)}
        icon={<CircleCheck />}
        tone="bg-success/15 text-success"
      />
      <Stat
        label="Perdidos"
        value={String(stats.lost.count)}
        hint={stats.lost.count === 1 ? 'negócio perdido' : 'negócios perdidos'}
        icon={<CircleX />}
        tone="bg-destructive/10 text-destructive"
      />
      <Stat
        label="Taxa de conversão"
        value={stats.conversionRate === null ? '—' : formatPercent(stats.conversionRate)}
        hint={stats.conversionRate === null ? 'Sem negócios encerrados' : 'Ganhos sobre encerrados'}
        icon={<Percent />}
        tone="bg-warning/15 text-warning"
      />
    </div>
  );
}
