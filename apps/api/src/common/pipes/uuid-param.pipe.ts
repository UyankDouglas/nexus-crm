import { ParseUUIDPipe } from '@nestjs/common';
import { AppException } from '../errors/app.exception';

/**
 * Valida IDs de rota. Um ID malformado não pode existir, então a resposta é a mesma de um
 * registro inexistente (404), sem chegar ao banco de dados.
 */
export function uuidParam(notFoundMessage: string): ParseUUIDPipe {
  return new ParseUUIDPipe({ exceptionFactory: () => AppException.notFound(notFoundMessage) });
}
