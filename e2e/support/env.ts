import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const E2E_DIR = resolve(ROOT_DIR, 'e2e');

/**
 * Em execuções locais, reaproveita `apps/api/.env` (banco de testes e senha de demonstração)
 * sem carregá-lo no ambiente: a API dos testes recebe apenas as variáveis listadas aqui.
 */
function localApiEnv(): Record<string, string | undefined> {
  const file = resolve(ROOT_DIR, 'apps/api/.env');
  return existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
}

const local = localApiEnv();
const externalBaseUrl = process.env.E2E_BASE_URL;

export const E2E = {
  /** Com `E2E_BASE_URL`, os testes rodam contra um ambiente já no ar (ex.: Docker de produção). */
  external: Boolean(externalBaseUrl),
  baseUrl: externalBaseUrl ?? 'http://localhost:4173',
  apiPort: 3334,
  /** Banco descartável: o mesmo dos testes de integração, recriado pela seed a cada execução. */
  databaseUrl:
    process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL_TEST ?? local.DATABASE_URL_TEST,
  demoPassword: process.env.SEED_DEMO_PASSWORD ?? local.SEED_DEMO_PASSWORD ?? '',
  /** Caixa de saída dos e-mails gravados pela API local dos testes. */
  outboxDir: resolve(E2E_DIR, '.mail-outbox'),
  authDir: resolve(E2E_DIR, '.auth'),
};

export function requireDemoPassword(): string {
  if (E2E.demoPassword.length < 8) {
    throw new Error('Defina SEED_DEMO_PASSWORD (ou crie apps/api/.env) para rodar os testes E2E.');
  }
  return E2E.demoPassword;
}
