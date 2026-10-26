import type { DateRange, ReportsOverview } from '@nexus/shared';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ChartCard } from '@/features/dashboard/components/charts/chart-card';
import { TooltipRow } from '@/features/dashboard/components/charts/tooltip-row';
import { bucketLabel } from '@/features/dashboard/period';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { ExportMenu } from './export-menu';

const config = {
  wonValue: { label: 'Receita', color: 'var(--chart-2)' },
} satisfies ChartConfig;

/** Receita dos negócios ganhos, agrupada por dia, semana ou mês conforme o período. */
export function RevenueReport({
  overview,
  range,
}: {
  overview: ReportsOverview | undefined;
  range: DateRange;
}) {
  const granularity = overview?.period.granularity ?? 'day';
  const data =
    overview?.revenue.map((bucket) => ({
      ...bucket,
      label: bucketLabel(bucket.start, granularity),
      long: bucketLabel(bucket.start, granularity, true),
    })) ?? [];

  return (
    <ChartCard
      title="Receita por período"
      description={
        granularity === 'month'
          ? 'Negócios ganhos por mês'
          : granularity === 'week'
            ? 'Negócios ganhos por semana'
            : 'Negócios ganhos por dia'
      }
      action={<ExportMenu type="revenue" range={range} />}
      loading={!overview}
      empty={(overview?.totals.wonValue ?? 0) === 0}
      emptyMessage="A receita aparece aqui assim que houver negócios ganhos no período."
    >
      <ChartContainer
        config={config}
        className="h-64 w-full"
        aria-label={`Receita no período: ${formatCurrency(overview?.totals.wonValue ?? 0)}`}
      >
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />
          <YAxis
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
            tickLine={false}
            axisLine={false}
            width={76}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(_, payload) =>
                  (payload[0]?.payload as { long?: string } | undefined)?.long
                }
                formatter={(value, _name, item) => {
                  const count = (item.payload as { wonCount: number }).wonCount;
                  return (
                    <div className="grid w-full gap-1">
                      <TooltipRow
                        color="var(--color-wonValue)"
                        label="Receita"
                        value={formatCurrency(Number(value))}
                      />
                      <TooltipRow label="Negócios ganhos" value={String(count)} />
                    </div>
                  );
                }}
              />
            }
          />
          <Bar dataKey="wonValue" fill="var(--color-wonValue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
