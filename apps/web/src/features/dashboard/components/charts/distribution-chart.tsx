import type { DashboardSummary } from '@nexus/shared';
import { Cell, Pie, PieChart } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatPercent } from '@/lib/format';
import { ChartCard } from './chart-card';

const config = {
  open: { label: 'Em andamento', color: 'var(--chart-1)' },
  won: { label: 'Ganhos', color: 'var(--success)' },
  lost: { label: 'Perdidos', color: 'var(--destructive)' },
} satisfies ChartConfig;

type Slice = keyof typeof config;

/** Distribuição dos negócios criados no período, pelo status atual. */
export function DistributionChart({ summary }: { summary: DashboardSummary | undefined }) {
  const distribution = summary?.distribution ?? { open: 0, won: 0, lost: 0 };
  const total = distribution.open + distribution.won + distribution.lost;
  const data = (Object.keys(config) as Slice[]).map((key) => ({
    key,
    label: config[key].label,
    total: distribution[key],
  }));

  return (
    <ChartCard
      title="Distribuição dos negócios"
      description="Negócios criados no período, por situação"
      loading={!summary}
      empty={total === 0}
      emptyMessage="Nenhum negócio foi criado no período selecionado."
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <ChartContainer
            config={config}
            className="aspect-square h-44"
            aria-label={`Distribuição: ${data.map((item) => `${item.total} ${item.label}`).join(', ')}`}
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="key" hideLabel />} />
              <Pie
                data={data}
                dataKey="total"
                nameKey="key"
                innerRadius={54}
                outerRadius={78}
                strokeWidth={3}
                stroke="var(--card)"
              >
                {data.map((item) => (
                  <Cell key={item.key} fill={`var(--color-${item.key})`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{total}</span>
            <span className="text-xs text-muted-foreground">negócios</span>
          </div>
        </div>
        <ul className="w-full space-y-2">
          {data.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              <span
                className="size-2.5 rounded-full"
                style={{ background: config[item.key].color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">{item.total}</span>
              <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">
                {total > 0 ? formatPercent(item.total / total) : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
