import type { DashboardSummary } from '@nexus/shared';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
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
  wonValue: { label: 'Receita', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** Vendas por período: receita dos negócios ganhos em cada dia, semana ou mês. */
export function SalesChart({ summary }: { summary: DashboardSummary | undefined }) {
  const granularity = summary?.period.granularity ?? 'day';
  const data =
    summary?.sales.map((bucket) => ({
      ...bucket,
      label: bucketLabel(bucket.start, granularity),
      long: bucketLabel(bucket.start, granularity, true),
    })) ?? [];
  const total = summary?.results.wonValue ?? 0;
  const unit = { day: 'dia', week: 'semana', month: 'mês' }[granularity];

  return (
    <ChartCard
      title="Vendas por período"
      description={`Receita de negócios ganhos por ${unit}`}
      loading={!summary}
      empty={total === 0}
      emptyMessage="Nenhum negócio foi ganho no período selecionado."
    >
      <ChartContainer
        config={config}
        className="h-60 w-full"
        aria-label={`Gráfico de vendas: ${formatCurrency(total)} em ${data.length} períodos`}
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
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  (payload[0]?.payload as { long?: string } | undefined)?.long
                }
                formatter={(value, _name, item) => (
                  <div className="grid w-full gap-1">
                    <TooltipRow
                      color="var(--color-wonValue)"
                      label="Receita"
                      value={formatCurrency(Number(value))}
                    />
                    <TooltipRow
                      label="Negócios ganhos"
                      value={String((item.payload as { wonCount: number }).wonCount)}
                    />
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="wonValue" fill="var(--color-wonValue)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
