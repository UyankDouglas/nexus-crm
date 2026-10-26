import type { LossReasonSummary } from '@nexus/shared';
import { ChartCard } from '@/features/dashboard/components/charts/chart-card';
import { formatCurrency, formatPercent } from '@/lib/format';

/** Principais motivos de perda no período, com a participação de cada um. */
export function LossReasons({ reasons }: { reasons: LossReasonSummary[] | undefined }) {
  const total = reasons?.reduce((sum, item) => sum + item.count, 0) ?? 0;

  return (
    <ChartCard
      title="Motivos de perda"
      description="Os mais frequentes no período"
      loading={!reasons}
      empty={total === 0}
      emptyMessage="Nenhum negócio perdido no período."
    >
      <ul className="space-y-4">
        {reasons?.map((item) => {
          const share = item.count / total;
          return (
            <li key={item.reason} className="space-y-1.5">
              <div className="flex items-start justify-between gap-3 text-sm">
                <span className="font-medium">{item.reason}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {item.count} {item.count === 1 ? 'negócio' : 'negócios'}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label={`${item.reason}: ${formatPercent(share)} das perdas`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(share * 100)}
              >
                <div
                  className="h-full rounded-full bg-destructive/70"
                  style={{ width: `${share * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(item.value)} · {formatPercent(share)} das perdas
              </p>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}
