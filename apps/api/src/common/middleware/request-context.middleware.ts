import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const logger = new Logger('HTTP');

/**
 * Atribui um identificador a cada requisição e registra método, rota, status e duração.
 * Propositalmente não registra corpo, query string, cookies ou cabeçalhos — evitando
 * vazamento de senhas e tokens nos logs.
 */
export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header('x-request-id');
  const requestId = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  request.requestId = requestId;
  response.setHeader('X-Request-Id', requestId);

  const startedAt = process.hrtime.bigint();
  response.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.log(
      `${request.method} ${request.path} ${response.statusCode} ${durationMs.toFixed(1)}ms [${requestId}]`,
    );
  });

  next();
}
