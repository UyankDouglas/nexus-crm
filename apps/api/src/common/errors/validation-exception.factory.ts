import type { ValidationError } from 'class-validator';
import { AppException } from './app.exception';

/** Converte os erros do class-validator em `{ campo: [mensagens] }`, incluindo objetos aninhados. */
export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    if (error.constraints) {
      result[path] = Object.entries(error.constraints).map(([constraint, message]) =>
        constraint === 'whitelistValidation' ? 'Campo não permitido.' : message,
      );
    }
    if (error.children?.length) {
      Object.assign(result, flattenValidationErrors(error.children, path));
    }
  }

  return result;
}

export function validationExceptionFactory(errors: ValidationError[]): AppException {
  return AppException.validation(flattenValidationErrors(errors));
}
