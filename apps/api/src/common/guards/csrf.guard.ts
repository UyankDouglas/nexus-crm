import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { API_ERROR_CODES } from '@nexus/shared';
import type { Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';
import { AuthCookiesService } from '../../modules/auth/auth-cookies.service';
import { CsrfService } from '../../modules/auth/csrf.service';
import { AppException } from '../errors/app.exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Exige token CSRF válido em toda requisição de escrita — inclusive login e cadastro,
 * evitando "login CSRF". Quando o navegador envia `Origin`, ela também precisa estar
 * entre as origens autorizadas (defesa em profundidade).
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrf: CsrfService,
    private readonly cookies: AuthCookiesService,
    private readonly config: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const origin = request.header('origin');
    if (origin && !this.config.allowedOrigins.includes(origin)) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        API_ERROR_CODES.CSRF_INVALID,
        'Origem da requisição não autorizada.',
      );
    }

    if (!this.csrf.verify(this.cookies.readCsrf(request), request.header('x-csrf-token'))) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        API_ERROR_CODES.CSRF_INVALID,
        'Token de segurança inválido. Recarregue a página e tente novamente.',
      );
    }

    return true;
  }
}
