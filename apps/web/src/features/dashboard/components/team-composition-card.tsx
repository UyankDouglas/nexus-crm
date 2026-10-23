import { MEMBER_ROLES, type OrganizationSummary, ROLE_LABELS } from '@nexus/shared';
import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  ADMIN: { label: ROLE_LABELS.ADMIN, color: 'var(--chart-1)' },
  MANAGER: { label: ROLE_LABELS.MANAGER, color: 'var(--chart-2)' },
  SALES: { label: ROLE_LABELS.SALES, color: 'var(--chart-3)' },
} satisfies ChartConfig;

/** Composição da equipe por perfil — dados reais de `/organizations/current`. */
export function TeamCompositionCard({ summary }: { summary: OrganizationSummary }) {
  const data = MEMBER_ROLES.map((role) => ({
    role,
    label: ROLE_LABELS[role],
    total: summary.membersByRole[role],
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Equipe por perfil</CardTitle>
        <CardDescription>Membros ativos na organização</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative">
          <ChartContainer
            config={chartConfig}
            className="aspect-square h-44"
            aria-label={`Gráfico: ${data.map((item) => `${item.total} ${item.label}`).join(', ')}`}
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="role" hideLabel />} />
              <Pie
                data={data}
                dataKey="total"
                nameKey="role"
                innerRadius={52}
                outerRadius={76}
                strokeWidth={3}
                stroke="var(--card)"
              >
                {data.map((item) => (
                  <Cell key={item.role} fill={`var(--color-${item.role})`} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tracking-tight">{summary.memberCount}</span>
            <span className="text-xs text-muted-foreground">membros</span>
          </div>
        </div>
        <ul className="w-full flex-1 space-y-3">
          {data.map((item) => (
            <li key={item.role} className="flex items-center gap-3 text-sm">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: chartConfig[item.role].color }}
                aria-hidden="true"
              />
              <span className="flex-1 text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">{item.total}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
