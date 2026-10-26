import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { storageFor } from '../support/users.js';

test.describe('Relatórios (gestor)', () => {
  test.use({ storageState: storageFor('manager') });

  test('mostra os indicadores do período e exporta CSV e Excel', async ({ page }) => {
    await page.goto('/relatorios');
    await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
    await expect(page.getByText('Receita ganha', { exact: true })).toBeVisible();
    await expect(page.getByText('Desempenho por vendedor', { exact: true })).toBeVisible();

    // Excel: um pacote ZIP (assinatura "PK") com o nome sugerido pela API.
    await page.getByRole('button', { name: 'Exportar Desempenho por vendedor' }).click();
    const [xlsx] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'Excel (.xlsx)' }).click(),
    ]);
    expect(xlsx.suggestedFilename()).toMatch(
      /^nexus-crm-sellers-\d{4}-\d{2}-\d{2}-a-\d{4}-\d{2}-\d{2}\.xlsx$/,
    );
    expect(
      readFileSync(await xlsx.path())
        .subarray(0, 2)
        .toString(),
    ).toBe('PK');

    // CSV: separador ";" e cabeçalho em português, pronto para o Excel.
    await page.getByRole('button', { name: 'Exportar Negócios ganhos e perdidos' }).click();
    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'CSV' }).click(),
    ]);
    expect(csv.suggestedFilename()).toMatch(/\.csv$/);
    expect(readFileSync(await csv.path(), 'utf8')).toContain('Fechamento;Negócio;Cliente');
  });

  test('o período escolhido fica na URL e vale para o relatório', async ({ page }) => {
    await page.goto('/relatorios');
    await page.getByRole('combobox', { name: 'Período dos relatórios' }).click();
    await page.getByRole('option', { name: 'Últimos 30 dias' }).click();
    await expect(page).toHaveURL(/periodo=30d/);
    await expect(page.getByText(/Resultados de últimos 30 dias/)).toBeVisible();
  });
});

test.describe('Navegação e acessibilidade', () => {
  test.use({ storageState: storageFor('admin') });

  test('a busca global abre um cliente pelo teclado', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Indicadores comerciais', { exact: true })).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Buscar clientes, negócios, módulos ou ações…').fill('Aurora');
    await page
      .getByRole('option', { name: /Aurora Distribuidora/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: /Aurora Distribuidora/, level: 1 }),
    ).toBeVisible();
  });

  test('o tema escuro é mantido ao recarregar a página', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Usar tema escuro' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.getByRole('button', { name: 'Usar tema claro' }).click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('no celular, o menu abre pela topbar e a página não rola na horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/relatorios');
    await expect(page.getByRole('heading', { name: 'Relatórios', level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await page.getByRole('button', { name: 'Recolher ou expandir menu lateral' }).click();
    await page.getByRole('link', { name: 'Funil de Vendas' }).click();
    await expect(page.getByRole('heading', { name: 'Funil de vendas', level: 1 })).toBeVisible();
  });

  test('rotas inexistentes mostram a página de não encontrado dentro do layout', async ({
    page,
  }) => {
    await page.goto('/rota-que-nao-existe');
    await expect(page.getByText('Página não encontrada')).toBeVisible();
    await expect(page.getByRole('button', { name: /Selecionar organização/ })).toBeVisible();
  });
});
