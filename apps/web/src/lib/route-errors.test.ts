import { describe, expect, it } from 'vitest';
import { isChunkLoadError, routeErrorMessage } from './route-errors';

describe('routeErrorMessage', () => {
  it('pede para recarregar quando uma tela não carrega após um novo deploy', () => {
    const chrome = new TypeError(
      'Failed to fetch dynamically imported module: https://crm.example.com/assets/tasks-page-1a2b.js',
    );
    const safari = new TypeError('Importing a module script failed.');
    expect(isChunkLoadError(chrome)).toBe(true);
    expect(isChunkLoadError(safari)).toBe(true);
    expect(routeErrorMessage(chrome)).toMatch(/nova versão/);
  });

  it('não expõe detalhes de erros inesperados', () => {
    const message = routeErrorMessage(
      new Error('Cannot read properties of undefined (reading "id")'),
    );
    expect(message).toBe(
      'Ocorreu um erro inesperado nesta tela. Recarregue a página para continuar.',
    );
    expect(isChunkLoadError('texto qualquer')).toBe(false);
  });
});
