import { expect, test } from '@playwright/test';
import { E2E } from '../support/env.js';
import { lastLinkSentTo } from '../support/outbox.js';
import { HORIZONTE, storageFor, unique, USERS } from '../support/users.js';

test.use({ storageState: storageFor('admin') });

test.describe('Administração', () => {
  test('convida por e-mail; a pessoa cria a conta e entra como vendedora', async ({
    page,
    browser,
  }) => {
    test.skip(E2E.external, 'em produção os e-mails não vão para a caixa de saída local');
    const email = `nova.pessoa.${unique()}@e2e.example`;

    await page.goto('/configuracoes?aba=convites');
    await page.getByRole('button', { name: 'Convidar membro' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('E-mail').fill(email);
    await dialog.getByRole('combobox', { name: 'Perfil' }).click();
    await page.getByRole('option', { name: 'Vendedor' }).click();
    await dialog.getByRole('button', { name: 'Enviar convite' }).click();
    await expect(page.getByRole('row').filter({ hasText: email })).toBeVisible();

    const link = await lastLinkSentTo(email);
    const guest = await browser.newContext({ storageState: undefined });
    const invited = await guest.newPage();
    await invited.goto(link);
    await expect(invited.getByRole('heading', { name: `Convite para ${HORIZONTE}` })).toBeVisible();
    await invited.getByLabel('Seu nome').fill('Pessoa Convidada');
    await invited.getByLabel('Crie uma senha').fill('SenhaForte123');
    await invited.getByLabel('Confirme a senha').fill('SenhaForte123');
    await invited.getByRole('button', { name: 'Criar conta e entrar' }).click();

    const switcher = invited.getByRole('button', { name: /Selecionar organização/ });
    await expect(switcher).toContainText(HORIZONTE);
    await expect(switcher).toContainText('Vendedor');

    // O link não pode ser usado de novo.
    await invited.goto(link);
    await expect(invited.getByText('Convite indisponível')).toBeVisible();
    await guest.close();

    // Para a administração, a pessoa já é membro e o aceite está na auditoria.
    await page.goto('/configuracoes?aba=membros');
    await expect(page.getByText(email)).toBeVisible();
    await page.goto('/configuracoes?aba=auditoria');
    await expect(page.getByText('Pessoa Convidada aceitou o convite').first()).toBeVisible();
  });

  test('altera o perfil de um membro e registra na auditoria', async ({ page }) => {
    await page.goto('/configuracoes?aba=membros');
    const role = page.getByRole('combobox', { name: `Perfil de ${USERS.otherSeller.name}` });

    await role.click();
    await page.getByRole('option', { name: 'Gestor Comercial' }).click();
    await expect(role).toHaveText('Gestor Comercial');

    await role.click();
    await page.getByRole('option', { name: 'Vendedor' }).click();
    await expect(role).toHaveText('Vendedor');

    await page.goto('/configuracoes?aba=auditoria');
    await expect(page.getByText('Perfil de membro alterado').first()).toBeVisible();
  });

  test('adiciona e exclui uma etapa do funil, com confirmação', async ({ page }) => {
    const stage = `Etapa E2E ${unique()}`;
    await page.goto('/configuracoes?aba=funis');
    await page.getByRole('button', { name: 'Adicionar etapa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome da etapa').fill(stage);
    await dialog.getByLabel('Probabilidade de fechamento (%)').fill('35');
    await dialog.getByRole('button', { name: 'Adicionar etapa' }).click();

    const list = page.getByRole('list', { name: /Etapas do funil/ });
    await expect(list.getByText(stage)).toBeVisible();

    await page.getByRole('button', { name: `Excluir ${stage}` }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir etapa' }).click();
    await expect(list.getByText(stage)).toHaveCount(0);
  });
});
