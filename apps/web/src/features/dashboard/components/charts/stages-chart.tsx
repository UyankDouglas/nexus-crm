import type { DashboardSummary } from '@nexus/shared';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatCurrency } from '@/lib/format';
import { paths } from '@/lib/navigation';
import { ChartCard } from './chart-card';
import { TooltipRow } from './tooltip-row';

const config = {
  count: { label: 'Negócios', color: 'var(--chart-1)' },
} satisfies ChartConfig;

/** Negociações por etapa: negócios em andamento em cada etapa do funil (situação atual). */
export function StagesChart({ summary }: { summary: DashboardSummary | undefined }) {
  const data = summary?.stages ?? [];
  const total = data.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <ChartCard
      title="Negociações por etapa"
      description="Negócios em andamento no funil, hoje"
      loading={!summary}
      empty={total === 0}
      emptyMessage="Não há negócios em andamento no funil."
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to={paths.pipeline}>Ver funil</Link>
        </Button>
      }
    >
      <ChartContainer
        config={config}
        className="h-60 w-full"
        aria-label={`Negócios por etapa: ${data.map((stage) => `${stage.name} ${stage.count}`).join(', ')}`}
      >
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 32 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" allowDecimals={false} hide />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={112}
            tickMargin={4}
          />
          <ChartTooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => (
                  <div className="grid w-full gap-1">
                    <TooltipRow color="var(--color-count)" label="Negócios" value={String(value)} />
                    <TooltipRow
                      label="Valor potencial"
                      value={formatCurrency((item.payload as { value: number }).value)}
                    />
                  </div>
                )}
              />
            }
          />
          <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]}>
            <LabelList dataKey="count" position="right" className="fill-foreground text-xs" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
