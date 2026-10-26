import type { DashboardSummary } from '@nexus/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { KpiGrid } from './kpi-grid';

const SUMMARY: DashboardSummary = {
  period: { from: '2026-07-29', to: '2026-10-26', granularity: 'week' },
  customers: { total: 23 },
  pipeline: { openCount: 17, openValue: 1_519_900 },
  results: { wonCount: 9, wonValue: 306_800, lostCount: 4, conversionRate: 9 / 13 },
  tasks: { open: 12, overdue: 2 },
  sales: [],
  stages: [],
  sellers: [],
  distribution: { open: 17, won: 6, lost: 3 },
};

function renderGrid(summary: DashboardSummary | undefined) {
  render(
    <MemoryRouter>
      <KpiGrid summary={summary} periodLabel="Últimos 90 dias" />
    </MemoryRouter>,
  );
}

describe('KpiGrid', () => {
  it('exibe os indicadores calculados pela API, formatados em pt-BR', () => {
    renderGrid(SUMMARY);

    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('69,2%')).toBeInTheDocument();
    expect(screen.getByTitle('R$ 306.800,00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 atrasadas/ })).toHaveAttribute(
      'href',
      '/tarefas?due=overdue',
    );
  });

  it('não inventa números enquanto os dados carregam', () => {
    renderGrid(undefined);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
  });

  it('indica quando ainda não há negócios encerrados para calcular a conversão', () => {
    renderGrid({ ...SUMMARY, results: { ...SUMMARY.results, conversionRate: null } });
    expect(screen.getByText('Sem negócios encerrados no período')).toBeInTheDocument();
  });
});
