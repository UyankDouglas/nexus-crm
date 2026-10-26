import { expect, test } from '@playwright/test';
import { storageFor, unique } from '../support/users.js';

test.use({ storageState: storageFor('seller') });

test.describe('Tarefas e atividades (vendedora)', () => {
  test('cria uma tarefa para hoje e a conclui', async ({ page }) => {
    const title = `Ligar para o cliente E2E ${unique()}`;
    await page.goto('/tarefas');
    await page.getByRole('button', { name: 'Nova tarefa' }).first().click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Título').fill(title);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
      new Date(),
    );
    await form.getByLabel('Prazo').fill(today);
    await form.getByRole('button', { name: 'Criar tarefa' }).click();

    const done = page.getByRole('checkbox', { name: `Concluir ${title}` });
    await expect(done).toBeVisible();
    await done.click();
    // A lista padrão mostra só as pendentes: a tarefa concluída sai dela.
    await expect(page.getByText(`Tarefa "${title}" concluída.`)).toBeVisible();
    await expect(done).toHaveCount(0);
  });

  test('registra uma interação com um cliente da própria carteira', async ({ page }) => {
    const subject = `Reunião de alinhamento E2E ${unique()}`;
    await page.goto('/tarefas?aba=atividades');
    await page.getByRole('button', { name: 'Registrar atividade' }).first().click();

    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Assunto').fill(subject);
    await dialog.getByRole('combobox', { name: /Cliente/ }).click();
    await page.getByRole('option').first().click();
    await dialog.getByRole('button', { name: 'Registrar' }).click();

    await expect(page.getByText(subject)).toBeVisible();
  });
});
