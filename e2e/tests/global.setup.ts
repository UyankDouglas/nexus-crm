import { expect, type Page, test as setup } from '@playwright/test';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { E2E, requireDemoPassword, ROOT_DIR } from '../support/env.js';
import { HORIZONTE, type Role, storageFor, USERS } from '../support/users.js';

setup('recria o banco de demonstração', async () => {
  setup.skip(E2E.external, 'o ambiente externo já foi migrado e populado');
  if (!E2E.databaseUrl) throw new Error('Defina DATABASE_URL_TEST (ou E2E_DATABASE_URL).');

  const env = {
    ...process.env,
    DATABASE_URL: E2E.databaseUrl,
    SEED_DEMO_PASSWORD: requireDemoPassword(),
    NODE_ENV: 'development',
  };
  const cwd = resolve(ROOT_DIR, 'apps/api');
  execSync('pnpm exec prisma migrate deploy', { cwd, env, stdio: 'pipe' });
  execSync('pnpm exec prisma db seed', { cwd, env, stdio: 'pipe' });

  rmSync(E2E.outboxDir, { recursive: true, force: true });
  mkdirSync(E2E.authDir, { recursive: true });
});

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(requireDemoPassword());
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
}

const ROLES: Array<[Role, string]> = [
  ['admin', USERS.admin.email],
  ['manager', USERS.manager.email],
  ['seller', USERS.seller.email],
  ['otherOrgAdmin', USERS.otherOrgAdmin.email],
];

for (const [role, email] of ROLES) {
  setup(`entra como ${role}`, async ({ page }) => {
    await signIn(page, email);
    if (role === 'manager') {
      // Carlos participa de duas organizações: a sessão salva trabalha na Horizonte.
      await page
        .getByRole('button', { name: new RegExp(HORIZONTE.replace(/[()]/g, '\\$&')) })
        .click();
    }
    await expect(page.getByText('Indicadores comerciais', { exact: true })).toBeVisible();
    await page.context().storageState({ path: storageFor(role) });
  });
}
