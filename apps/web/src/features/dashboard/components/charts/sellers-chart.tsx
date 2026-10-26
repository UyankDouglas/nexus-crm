import type { DashboardSummary } from '@nexus/shared';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/format';
import { ChartCard } from './chart-card';
import { TooltipRow } from './tooltip-row';

const config = {
  wonValue: { label: 'Receita', color: 'var(--chart-1)' },
  openValue: { label: 'Em andamento', color: 'var(--chart-5)' },
} satisfies ChartConfig;

/**
 * Performance por vendedor no período: receita ganha e pipeline em aberto. Para vendedores, a
 * API devolve apenas a própria linha — o cartão vira "Seu desempenho".
 */
export function SellersChart({
  summary,
  teamView,
}: {
  summary: DashboardSummary | undefined;
  teamView: boolean;
}) {
  const sellers = summary?.sellers ?? [];
  const data = sellers.map((row) => ({
    ...row,
    name: row.user?.name ?? 'Sem responsável',
  }));
  const hasData = sellers.some((row) => row.wonValue > 0 || row.openValue > 0 || row.lostCount > 0);

  return (
    <ChartCard
      title={teamView ? 'Performance por vendedor' : 'Seu desempenho'}
      description="Receita ganha no período e valor em andamento"
      loading={!summary}
      empty={!hasData}
      emptyMessage="Sem negócios ganhos, perdidos ou em andamento para comparar."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <ChartContainer
          config={config}
          className="w-full lg:col-span-3"
          style={{ height: Math.max(160, data.length * 44 + 40) }}
          aria-label={`Receita por vendedor: ${data.map((row) => `${row.name} ${formatCurrency(row.wonValue)}`).join(', ')}`}
        >
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value: number) => formatCurrencyCompact(value)}
              tickLine={false}
              axisLine={false}
            />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={112} />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <TooltipRow
                      color={`var(--color-${String(name)})`}
                      label={config[name as keyof typeof config]?.label ?? String(name)}
                      value={formatCurrency(Number(value))}
                    />
                  )}
                />
              }
            />
            <Bar dataKey="wonValue" fill="var(--color-wonValue)" radius={4} barSize={14} />
            <Bar dataKey="openValue" fill="var(--color-openValue)" radius={4} barSize={14} />
          </BarChart>
        </ChartContainer>

        <div className="lg:col-span-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Ganhos</TableHead>
                <TableHead className="text-right">Perdidos</TableHead>
                <TableHead className="text-right">Conversão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.user?.id ?? 'none'}>
                  <TableCell className="max-w-36 truncate font-medium">{row.name}</TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    title={formatCurrency(row.wonValue)}
                  >
                    {row.wonCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.lostCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.conversionRate === null ? '—' : formatPercent(row.conversionRate)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ChartCard>
  );
}
