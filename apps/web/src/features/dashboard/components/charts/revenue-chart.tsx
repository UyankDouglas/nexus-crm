import type { DashboardSummary } from '@nexus/shared';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { bucketLabel } from '../../period';
import { ChartCard } from './chart-card';
import { TooltipRow } from './tooltip-row';

const config = {
  cumulative: { label: 'Receita acumulada', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** Evolução da receita: soma acumulada dos negócios ganhos ao longo do período. */
export function RevenueChart({ summary }: { summary: DashboardSummary | undefined }) {
  const granularity = summary?.period.granularity ?? 'day';
  let running = 0;
  const data =
    summary?.sales.map((bucket) => {
      running = Math.round((running + bucket.wonValue) * 100) / 100;
      return {
        label: bucketLabel(bucket.start, granularity),
        long: bucketLabel(bucket.start, granularity, true),
        cumulative: running,
      };
    }) ?? [];

  return (
    <ChartCard
      title="Evolução da receita"
      description="Receita acumulada no período"
      loading={!summary}
      empty={(summary?.results.wonValue ?? 0) === 0}
      emptyMessage="A receita aparece aqui assim que houver negócios ganhos no período."
    >
      <ChartContainer
        config={config}
        className="h-60 w-full"
        aria-label={`Receita acumulada no período: ${formatCurrency(running)}`}
      >
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-cumulative)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-cumulative)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
          <YAxis
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
            tickLine={false}
            axisLine={false}
            width={76}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) =>
                  (payload[0]?.payload as { long?: string } | undefined)?.long
                }
                formatter={(value) => (
                  <TooltipRow
                    color="var(--color-cumulative)"
                    label="Acumulado"
                    value={formatCurrency(Number(value))}
                  />
                )}
              />
            }
          />
          <Area
            dataKey="cumulative"
            type="monotone"
            stroke="var(--color-cumulative)"
            strokeWidth={2}
            fill="url(#revenue-fill)"
          />
        </AreaChart>
      </ChartContainer>
    </ChartCard>
  );
}
