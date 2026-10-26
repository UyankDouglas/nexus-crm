import { defineConfig, devices } from '@playwright/test';
import { E2E } from './support/env.js';

const apiUrl = `http://localhost:${E2E.apiPort}`;

/**
 * Testes ponta a ponta. Por padrão sobem a API compilada (`apps/api/dist`) e o build do
 * frontend (`vite preview`) contra o banco de testes, recriado pela seed de demonstração.
 * Com `E2E_BASE_URL`, usam um ambiente já no ar (ex.: os contêineres de produção no CI).
 */
export default defineConfig({
  testDir: './tests',
  // Os testes compartilham o mesmo banco de demonstração: execução em série, previsível.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['list']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: E2E.baseUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Localmente é possível usar um navegador instalado (ex.: E2E_BROWSER_CHANNEL=msedge).
    channel: process.env.E2E_BROWSER_CHANNEL || undefined,
  },
  projects: [
    { name: 'preparação', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      dependencies: ['preparação'],
      use: { ...devices['Desktop Chrome'], channel: process.env.E2E_BROWSER_CHANNEL || undefined },
    },
  ],
  webServer: E2E.external
    ? undefined
    : [
        {
          name: 'API',
          command: 'pnpm --filter @nexus/api start',
          url: `${apiUrl}/api/health`,
          timeout: 60_000,
          reuseExistingServer: false,
          env: {
            NODE_ENV: 'test',
            PORT: String(E2E.apiPort),
            APP_URL: E2E.baseUrl,
            DATABASE_URL: E2E.databaseUrl ?? '',
            CSRF_SECRET: 'e2e-segredo-csrf-com-mais-de-32-caracteres',
            // Muitos logins em sequência: os limites de produção barrariam a suíte.
            RATE_LIMIT_MAX: '5000',
            RATE_LIMIT_AUTH_MAX: '500',
            SWAGGER_ENABLED: 'false',
            MAIL_OUTBOX_DIR: E2E.outboxDir,
          },
        },
        {
          name: 'Web',
          command: 'pnpm --filter @nexus/web exec vite preview --port 4173 --strictPort',
          url: E2E.baseUrl,
          timeout: 60_000,
          reuseExistingServer: false,
          env: { VITE_API_PROXY_TARGET: apiUrl },
        },
      ],
});
