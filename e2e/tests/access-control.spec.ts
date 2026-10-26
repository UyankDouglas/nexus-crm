import { type Browser, expect, test } from '@playwright/test';
import { Api } from '../support/api.js';
import { type Role, storageFor } from '../support/users.js';

/** Registros da Horizonte que pertencem ao vendedor Rafael (seed de demonstração). */
const RAFAEL_CUSTOMER = 'Maré Pescados';
const RAFAEL_DEAL = 'Fornecimento de embalagens';

async function apiAs(browser: Browser, role: Role) {
  const context = await browser.newContext({ storageState: storageFor(role) });
  return { context, api: new Api(context.request) };
}

/** IDs reais obtidos com a sessão da administradora da Horizonte. */
async function horizonteIds(browser: Browser) {
  const { context, api } = await apiAs(browser, 'admin');
  const ids = {
    customer: await api.findId('/customers', RAFAEL_CUSTOMER),
    deal: await api.findId('/deals', RAFAEL_DEAL),
  };
  await context.close();
  return ids;
}

test.describe('Permissões por perfil', () => {
  test.use({ storageState: storageFor('seller') });

  test('a vendedora não vê relatórios nem as abas administrativas', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.getByRole('navigation').first();
    await expect(page.getByRole('link', { name: 'Clientes' }).first()).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Relatórios' })).toHaveCount(0);

    await page.goto('/relatorios');
    await expect(page.getByText('Relatórios restritos')).toBeVisible();
    expect(
      (await page.request.get('/api/reports/overview?from=2026-01-01&to=2026-01-31')).status(),
    ).toBe(403);

    await page.goto('/configuracoes?aba=auditoria');
    await expect(page.getByRole('tab')).toHaveText(['Organização', 'Membros', 'Permissões']);
    expect((await page.request.get('/api/audit')).status()).toBe(403);
  });

  test('a vendedora não abre clientes nem negócios da carteira de outro vendedor', async ({
    page,
    browser,
  }) => {
    const ids = await horizonteIds(browser);

    await page.goto(`/clientes/${ids.customer}`);
    await expect(page.getByText('Cliente não encontrado')).toBeVisible();
    await page.goto(`/funil?negocio=${ids.deal}`);
    await expect(page.getByText('Negócio indisponível')).toBeVisible();

    expect((await page.request.get(`/api/customers/${ids.customer}`)).status()).toBe(404);
    expect((await page.request.get(`/api/deals/${ids.deal}`)).status()).toBe(404);
  });
});

test.describe('Isolamento entre organizações', () => {
  test.use({ storageState: storageFor('otherOrgAdmin') });

  test('a administradora da Vértice não alcança dados da Horizonte', async ({ page, browser }) => {
    const ids = await horizonteIds(browser);

    await page.goto(`/clientes/${ids.customer}`);
    await expect(page.getByText('Cliente não encontrado')).toBeVisible();
    await page.goto(`/funil?negocio=${ids.deal}`);
    await expect(page.getByText('Negócio indisponível')).toBeVisible();

    expect((await page.request.get(`/api/customers/${ids.customer}`)).status()).toBe(404);
    expect((await page.request.get(`/api/deals/${ids.deal}`)).status()).toBe(404);

    // Buscas e listagens só trazem a própria organização.
    await page.goto('/clientes');
    await page.getByLabel('Buscar clientes').fill(RAFAEL_CUSTOMER);
    await expect(page.getByText('Nenhum cliente encontrado')).toBeVisible();
  });

  test('sem sessão, a API recusa qualquer dado', async ({ browser }) => {
    const anonymous = await browser.newContext({ storageState: undefined });
    for (const path of ['/api/customers', '/api/deals', '/api/reports/overview', '/api/audit']) {
      expect((await anonymous.request.get(path)).status(), path).toBe(401);
    }
    await anonymous.close();
  });
});
