import { expect } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { E2E } from './env.js';

/** Link do último e-mail gravado para o destinatário na caixa de saída local da API. */
export async function lastLinkSentTo(email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      () => {
        const files = readdirSafe().sort().reverse();
        for (const file of files) {
          const content = readFileSync(join(E2E.outboxDir, file), 'utf8');
          if (!content.includes(`To: ${email}`)) continue;
          link = /https?:\/\/\S+/.exec(content)?.[0];
          return link;
        }
        return undefined;
      },
      { message: `e-mail para ${email} na caixa de saída`, timeout: 10_000 },
    )
    .toBeTruthy();
  return link!;
}

function readdirSafe(): string[] {
  try {
    return readdirSync(E2E.outboxDir).filter((file) => file.endsWith('.eml'));
  } catch {
    return [];
  }
}
