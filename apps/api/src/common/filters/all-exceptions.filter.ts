import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { API_ERROR_CODES, type ApiErrorBody, type ApiErrorCode } from '@nexus/shared';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { AppException } from '../errors/app.exception';

const STATUS_CODES: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODES.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: API_ERROR_CODES.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: API_ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: API_ERROR_CODES.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: API_ERROR_CODES.RATE_LIMITED,
};

const DEFAULT_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Requisição inválida.',
  [HttpStatus.UNAUTHORIZED]: 'Autenticação necessária.',
  [HttpStatus.FORBIDDEN]: 'Acesso negado.',
  [HttpStatus.NOT_FOUND]: 'Recurso não encontrado.',
  [HttpStatus.CONFLICT]: 'O registro conflita com dados existentes.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Muitas tentativas. Aguarde um instante e tente novamente.',
};

/**
 * Filtro global: padroniza o corpo de erro (`ApiErrorBody`), traduz erros conhecidos
 * do Prisma e registra falhas inesperadas sem expor detalhes internos ao cliente.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const body = this.toBody(exception);
    body.requestId = request.requestId;

    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.path} → ${body.statusCode} [${body.requestId ?? '-'}]`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        ...(exception.fieldErrors ? { fieldErrors: exception.fieldErrors } : {}),
      };
    }

    if (exception instanceof ThrottlerException) {
      return this.fromStatus(HttpStatus.TOO_MANY_REQUESTS);
    }

    if (exception instanceof HttpException) {
      return this.fromStatus(exception.getStatus());
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') return this.fromStatus(HttpStatus.CONFLICT);
      if (exception.code === 'P2025') return this.fromStatus(HttpStatus.NOT_FOUND);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: API_ERROR_CODES.INTERNAL_ERROR,
      message: 'Ocorreu um erro inesperado. Tente novamente em instantes.',
    };
  }

  private fromStatus(status: number): ApiErrorBody {
    return {
      statusCode: status,
      code: STATUS_CODES[status] ?? API_ERROR_CODES.INTERNAL_ERROR,
      message: DEFAULT_MESSAGES[status] ?? 'Não foi possível concluir a requisição.',
    };
  }
}
