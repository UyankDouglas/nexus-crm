import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { applyTestEnv } from './test-env';

/** Aplica as migrations no banco de testes antes da suíte de integração. */
export default function globalSetup(): void {
  applyTestEnv();
  execSync('pnpm exec prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
}
