import { expect, type Page, test } from '@playwright/test';
import { requireDemoPassword } from '../support/env.js';
import { HORIZONTE, unique, USERS, VERTICE } from '../support/users.js';

async function fillLogin(page: Page, email: string, password = requireDemoPassword()) {
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

test.describe('Autenticação', () => {
  test('quem não está logado vai para o login e volta à página pedida depois de entrar', async ({
    page,
  }) => {
    await page.goto('/clientes');
    await expect(page).toHaveURL(/\/entrar/);

    await fillLogin(page, USERS.seller.email);

    await expect(page).toHaveURL(/\/clientes$/);
    await expect(page.getByRole('heading', { name: 'Clientes', level: 1 })).toBeVisible();
  });

  test('senha incorreta mostra o erro e não abre a sessão', async ({ page }) => {
    await page.goto('/entrar');
    await fillLogin(page, USERS.seller.email, 'SenhaErrada123');

    await expect(page.getByRole('alert')).toContainText('E-mail ou senha incorretos');
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
  });

  test('sair encerra a sessão: o cookie antigo deixa de valer', async ({ page, browser }) => {
    await page.goto('/entrar');
    await fillLogin(page, USERS.otherSeller.email);
    await expect(page.getByText('Indicadores comerciais', { exact: true })).toBeVisible();
    const cookies = await page.context().cookies();

    await page.getByRole('button', { name: `Menu do usuário ${USERS.otherSeller.name}` }).click();
    await page.getByRole('menuitem', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/entrar/);

    // Reaproveitar o cookie da sessão encerrada não devolve o acesso.
    const replay = await browser.newContext();
    await replay.addCookies(cookies);
    const replayPage = await replay.newPage();
    await replayPage.goto('/');
    await expect(replayPage).toHaveURL(/\/entrar/);
    const me = await replayPage.request.get('/api/auth/me');
    expect(me.status()).toBe(401);
    await replay.close();
  });

  test('cadastra uma nova organização com seu administrador', async ({ page }) => {
    const id = unique();
    const company = `Empresa E2E ${id}`;
    await page.goto('/cadastro');
    await page.getByLabel('Seu nome').fill('Pessoa Fundadora');
    await page.getByLabel('E-mail corporativo').fill(`fundadora.${id}@e2e.example`);
    await page.getByLabel('Nome da empresa').fill(company);
    await page.getByLabel('Senha', { exact: true }).fill('SenhaForte123');
    await page.getByLabel('Confirme a senha').fill('SenhaForte123');
    await page.getByRole('button', { name: 'Criar conta' }).click();

    await expect(page.getByRole('heading', { name: /Pessoa/, level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /Selecionar organização/ })).toContainText(
      company,
    );
    // A organização nova começa vazia: nada da demonstração aparece.
    await page.goto('/clientes');
    await expect(page.getByText('Nenhum cliente cadastrado')).toBeVisible();
  });

  test('quem participa de duas organizações escolhe onde trabalhar', async ({ page }) => {
    await page.goto('/entrar');
    await fillLogin(page, USERS.manager.email);

    await expect(page.getByText('Escolha onde deseja trabalhar agora.')).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(HORIZONTE.replace(/[()]/g, '\\$&')) }),
    ).toBeVisible();
    await page.getByRole('button', { name: new RegExp(VERTICE.replace(/[()]/g, '\\$&')) }).click();

    const switcher = page.getByRole('button', { name: /Selecionar organização/ });
    await expect(switcher).toContainText(VERTICE);
    await expect(switcher).toContainText('Vendedor');
  });
});
