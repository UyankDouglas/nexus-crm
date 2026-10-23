import { describe, expect, it } from 'vitest';
import { safeRedirect } from './safe-redirect';

describe('safeRedirect', () => {
  it.each(['/clientes', '/configuracoes?aba=membros', '/'])(
    'aceita o caminho interno %s',
    (path) => {
      expect(safeRedirect(path)).toBe(path);
    },
  );

  it.each([
    'https://site-malicioso.example',
    '//site-malicioso.example',
    '/\\site-malicioso.example',
    'javascript:alert(1)',
    '',
    null,
  ])('rejeita o destino %s', (value) => {
    expect(safeRedirect(value)).toBe('/');
  });
});
