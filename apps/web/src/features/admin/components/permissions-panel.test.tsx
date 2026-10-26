import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionsPanel } from './permissions-panel';

/** Células de Administrador, Gestor e Vendedor na linha da permissão. */
function cellsOf(label: string) {
  const row = screen.getByRole('cell', { name: label }).closest('tr')!;
  return within(row).getAllByRole('cell').slice(1);
}

const verdicts = (cells: HTMLElement[]) =>
  cells.map((cell) =>
    within(cell)
      .getByLabelText(/permitido/i)
      .getAttribute('aria-label'),
  );

describe('PermissionsPanel', () => {
  it('mostra a mesma matriz usada pela API para cada perfil', () => {
    render(<PermissionsPanel />);

    expect(verdicts(cellsOf('Exportar relatórios (CSV e Excel)'))).toEqual([
      'Permitido',
      'Permitido',
      'Não permitido',
    ]);
    expect(verdicts(cellsOf('Consultar a auditoria de ações'))).toEqual([
      'Permitido',
      'Não permitido',
      'Não permitido',
    ]);
  });

  it('indica que o vendedor só opera a própria carteira', () => {
    render(<PermissionsPanel />);

    const [admin, , sales] = cellsOf('Visualizar clientes');
    expect(sales).toHaveTextContent('própria carteira');
    expect(admin).not.toHaveTextContent('própria carteira');
  });
});
