import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_ERROR_CODES } from '@nexus/shared';
import type { Request, Response } from 'express';
import { AuthCookiesService } from '../../modules/auth/auth-cookies.service';
import { SessionsService } from '../../modules/auth/sessions.service';
import { ALLOW_WITHOUT_ORGANIZATION_KEY, IS_PUBLIC_KEY } from '../auth/auth.decorators';
import { AppException } from '../errors/app.exception';

/**
 * Guard global de autenticação. Toda rota exige sessão válida, exceto as marcadas com
 * `@Public()`, e organização ativa, exceto as marcadas com `@AllowWithoutOrganization()`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsService,
    private readonly cookies: AuthCookiesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const token = this.cookies.readSession(request);
    if (!token) throw AppException.unauthenticated('Faça login para continuar.');

    const auth = await this.sessions.resolve(token);
    if (!auth) {
      this.cookies.clearSession(http.getResponse<Response>());
      throw AppException.unauthenticated();
    }
    request.auth = auth;

    const allowWithoutOrganization = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WITHOUT_ORGANIZATION_KEY,
      targets,
    );
    if (!allowWithoutOrganization && !auth.organization) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        API_ERROR_CODES.ORGANIZATION_REQUIRED,
        'Selecione uma organização para continuar.',
      );
    }

    return true;
  }
}
