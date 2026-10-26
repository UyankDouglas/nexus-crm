import { isRouteErrorResponse } from 'react-router';

/**
 * Após um novo deploy, os arquivos das telas carregadas sob demanda mudam de nome: uma aba
 * aberta antes da atualização falha ao importá-los até a página ser recarregada.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(
    error.message,
  );
}

/** Mensagem exibida ao usuário para um erro de rota, sem detalhes internos. */
export function routeErrorMessage(error: unknown): string {
  if (isChunkLoadError(error)) {
    return 'Uma nova versão do NEXUS CRM foi publicada. Recarregue a página para continuar.';
  }
  if (isRouteErrorResponse(error)) return `${error.status} — ${error.statusText}`;
  return 'Ocorreu um erro inesperado nesta tela. Recarregue a página para continuar.';
}
