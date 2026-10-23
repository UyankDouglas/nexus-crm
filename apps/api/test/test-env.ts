import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

/**
 * Prepara as variáveis de ambiente dos testes de integração. Usa sempre o banco de
 * testes (`DATABASE_URL_TEST`), nunca o banco de desenvolvimento.
 */
export function applyTestEnv(): void {
  // globalSetup e setupFiles podem rodar no mesmo processo (--runInBand).
  if (process.env.NEXUS_TEST_ENV_APPLIED === 'true') return;
  loadDotenv({ path: resolve(__dirname, '../.env'), quiet: true });

  const testDatabaseUrl = process.env.DATABASE_URL_TEST;
  if (!testDatabaseUrl) {
    throw new Error(
      'Defina DATABASE_URL_TEST (banco exclusivo para testes) em apps/api/.env ou no ambiente.',
    );
  }
  if (testDatabaseUrl === process.env.DATABASE_URL && process.env.CI !== 'true') {
    throw new Error('DATABASE_URL_TEST não pode apontar para o mesmo banco de DATABASE_URL.');
  }

  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: testDatabaseUrl,
    APP_URL: 'http://localhost:5173',
    CORS_ORIGINS: 'http://localhost:5173',
    CSRF_SECRET: process.env.CSRF_SECRET ?? 'segredo-de-teste-com-mais-de-32-caracteres',
    RATE_LIMIT_MAX: '1000',
    RATE_LIMIT_AUTH_MAX: '30',
    SWAGGER_ENABLED: 'false',
    NEXUS_TEST_ENV_APPLIED: 'true',
  });
}
