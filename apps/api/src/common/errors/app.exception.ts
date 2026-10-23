import { HttpException, HttpStatus } from '@nestjs/common';
import { API_ERROR_CODES, type ApiErrorCode } from '@nexus/shared';

/**
 * Exceção de domínio com código estável (consumido pelo frontend) e mensagem
 * em português pronta para exibição.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ApiErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message, status);
  }

  static unauthenticated(message = 'Sua sessão expirou. Entre novamente.'): AppException {
    return new AppException(HttpStatus.UNAUTHORIZED, API_ERROR_CODES.UNAUTHENTICATED, message);
  }

  static forbidden(message = 'Você não tem permissão para realizar esta ação.'): AppException {
    return new AppException(HttpStatus.FORBIDDEN, API_ERROR_CODES.FORBIDDEN, message);
  }

  static notFound(message = 'Registro não encontrado.'): AppException {
    return new AppException(HttpStatus.NOT_FOUND, API_ERROR_CODES.NOT_FOUND, message);
  }

  static validation(fieldErrors: Record<string, string[]>): AppException {
    return new AppException(
      HttpStatus.BAD_REQUEST,
      API_ERROR_CODES.VALIDATION_FAILED,
      'Verifique os dados informados.',
      fieldErrors,
    );
  }
}
