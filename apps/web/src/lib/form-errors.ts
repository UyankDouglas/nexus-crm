import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/services/api-client';

/**
 * Aplica os erros de campo devolvidos pela API ao formulário e retorna a mensagem geral
 * a ser exibida (ou `null` quando todos os erros foram associados a campos).
 */
export function applyApiErrors<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  fields: ReadonlyArray<FieldPath<TValues>>,
): string | null {
  if (!isApiError(error)) return 'Ocorreu um erro inesperado. Tente novamente.';

  let unmatched = false;
  for (const [field, messages] of Object.entries(error.fieldErrors ?? {})) {
    if ((fields as readonly string[]).includes(field)) {
      setError(field as FieldPath<TValues>, { type: 'server', message: messages[0] });
    } else {
      unmatched = true;
    }
  }

  return error.fieldErrors && !unmatched ? null : error.message;
}
