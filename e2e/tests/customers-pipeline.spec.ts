import { expect, type Page, test } from '@playwright/test';
import { Api } from '../support/api.js';
import { storageFor, unique } from '../support/users.js';

test.use({ storageState: storageFor('admin') });

function column(page: Page, stage: string) {
  return page.getByRole('region', { name: new RegExp(`^${stage}`) });
}

test.describe('Clientes e funil de vendas', () => {
  test('cadastra um cliente, encontra-o na busca e abre o detalhe', async ({ page }) => {
    const name = `Pessoa E2E ${unique()}`;
    await page.goto('/clientes');
    await page.getByRole('button', { name: 'Novo cliente' }).click();
    await page.getByLabel('Pessoa física').check();
    await page.getByLabel('Nome completo').fill(name);
    await page.getByLabel('E-mail').fill('pessoa.e2e@cliente.example');
    await page.getByRole('button', { name: 'Cadastrar' }).click();

    // Após o cadastro, a aplicação abre o detalhe do cliente.
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

    await page.goto('/clientes');
    await page.getByLabel('Buscar clientes').fill(name);
    await expect(page).toHaveURL(/search=/);
    await page.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  });

  test('cria um negócio, move pelo funil (menu e teclado) e registra a perda', async ({ page }) => {
    const api = new Api(page.request);
    const id = unique();
    const customer = await api.post<{ id: string }>('/customers', {
      type: 'COMPANY',
      name: `Empresa Funil ${id}`,
    });
    const title = `Negócio E2E ${id}`;

    await page.goto(`/clientes/${customer.id}`);
    await page.getByRole('button', { name: 'Novo negócio' }).first().click();
    await page.getByLabel('Nome do negócio').fill(title);
    await page.getByLabel('Valor potencial').fill('12500');
    await page.getByRole('button', { name: 'Cadastrar' }).click();
    await expect(page.getByText(`Negócio ${title} cadastrado em Novo lead.`)).toBeVisible();

    await page.goto('/funil');
    await expect(column(page, 'Novo lead').getByText(title)).toBeVisible();

    // Mover pelo menu do card.
    await page.getByRole('button', { name: `Ações para ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Qualificação' }).click();
    await expect(column(page, 'Qualificação').getByText(title)).toBeVisible();

    // Mover pelo teclado: a alça do card inicia o arraste e as setas trocam de etapa. Cada
    // passo é confirmado pelos anúncios lidos pelos leitores de tela.
    const announced = (text: string) =>
      expect(page.getByText(text, { exact: true })).toBeAttached();
    await page.getByRole('button', { name: `Mover ${title}` }).focus();
    await page.keyboard.press('Space');
    // Ao iniciar o arraste, o leitor de tela anuncia a etapa em que o card está.
    await announced('Sobre a etapa Qualificação.');
    await page.keyboard.press('ArrowRight');
    await announced('Sobre a etapa Proposta enviada.');
    await page.keyboard.press('Space');
    await announced('Negócio solto na etapa Proposta enviada.');
    await expect(column(page, 'Proposta enviada').getByText(title)).toBeVisible();

    // A etapa seguinte fica fora da área visível: o quadro rola junto com o card. Antes, espera a
    // animação de soltura (a cópia flutuante do card) terminar.
    const handle = page.getByRole('button', { name: `Mover ${title}` });
    await expect(handle).toHaveCount(1);
    await handle.focus();
    await page.keyboard.press('Space');
    await announced('Sobre a etapa Proposta enviada.');
    await page.keyboard.press('ArrowRight');
    await announced('Sobre a etapa Negociação.');
    await page.keyboard.press('Space');
    await announced('Negócio solto na etapa Negociação.');
    await expect(column(page, 'Negociação').getByText(title)).toBeVisible();

    // Perder exige motivo.
    await page.getByRole('button', { name: `Ações para ${title}` }).click();
    await page.getByRole('menuitem', { name: 'Perdido' }).click();
    await expect(page.getByText('Por que o negócio foi perdido?')).toBeVisible();
    await page.getByRole('button', { name: 'Escolheu um concorrente', exact: true }).click();
    await page.getByRole('button', { name: 'Marcar como perdido' }).click();
    await expect(column(page, 'Perdido').getByText(title)).toBeVisible();

    // O histórico registra cada movimentação.
    await column(page, 'Perdido').getByText(title).click();
    const history = page.getByRole('dialog');
    await expect(history.getByText('Histórico de movimentações')).toBeVisible();
    await expect(history.getByText('Escolheu um concorrente').first()).toBeVisible();
    await expect(history.getByText('Proposta enviada').first()).toBeVisible();
  });
});
