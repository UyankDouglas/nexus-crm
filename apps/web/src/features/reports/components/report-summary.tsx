import type { ReportsOverview } from '@nexus/shared';
import { CircleDollarSign, CircleX, Percent, Receipt, Scale, Wallet } from 'lucide-react';
import { KpiCard, KpiHint, KpiValue } from '@/features/dashboard/components/kpi-grid';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '@/lib/format';

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** Totais do período (resultados) e da carteira atual (pipeline). */
export function ReportSummary({ totals }: { totals: ReportsOverview['totals'] | undefined }) {
  const money = (value: number | null | undefined) =>
    value === undefined ? undefined : value === null ? '—' : formatCurrencyCompact(value);
  const full = (value: number | null | undefined) =>
    value === undefined || value === null ? undefined : formatCurrency(value);
  const closed = totals ? totals.wonCount + totals.lostCount : 0;

  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      <li>
        <KpiCard label="Receita ganha" icon={CircleDollarSign} tone="bg-success/15 text-success">
          <KpiValue value={money(totals?.wonValue)} title={full(totals?.wonValue)} />
          <KpiHint>{totals && plural(totals.wonCount, 'negócio ganho', 'negócios ganhos')}</KpiHint>
        </KpiCard>
      </li>
      <li>
        <KpiCard label="Taxa de conversão" icon={Percent} tone="bg-warning/15 text-warning">
          <KpiValue
            value={
              totals &&
              (totals.conversionRate === null ? '—' : formatPercent(totals.conversionRate))
            }
          />
          <KpiHint>
            {totals &&
              (closed === 0
                ? 'Sem negócios encerrados no período'
                : `${totals.wonCount} ganhos de ${plural(closed, 'encerrado', 'encerrados')}`)}
          </KpiHint>
        </KpiCard>
      </li>
      <li>
        <KpiCard label="Ticket médio" icon={Receipt}>
          <KpiValue value={money(totals?.averageTicket)} title={full(totals?.averageTicket)} />
          <KpiHint>Receita ganha ÷ negócios ganhos</KpiHint>
        </KpiCard>
      </li>
      <li>
        <KpiCard label="Valor perdido" icon={CircleX} tone="bg-destructive/10 text-destructive">
          <KpiValue value={money(totals?.lostValue)} title={full(totals?.lostValue)} />
          <KpiHint>
            {totals && plural(totals.lostCount, 'negócio perdido', 'negócios perdidos')}
          </KpiHint>
        </KpiCard>
      </li>
      <li>
        <KpiCard label="Pipeline em aberto" icon={Wallet}>
          <KpiValue value={money(totals?.openValue)} title={full(totals?.openValue)} />
          <KpiHint>
            {totals && `${plural(totals.openCount, 'negócio', 'negócios')} · situação atual`}
          </KpiHint>
        </KpiCard>
      </li>
      <li>
        <KpiCard label="Previsão ponderada" icon={Scale} tone="bg-chart-4/15 text-chart-4">
          <KpiValue value={money(totals?.weightedValue)} title={full(totals?.weightedValue)} />
          <KpiHint>Valor × probabilidade de cada etapa</KpiHint>
        </KpiCard>
      </li>
    </ul>
  );
}
