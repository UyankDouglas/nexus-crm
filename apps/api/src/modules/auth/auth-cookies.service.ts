import { Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Centraliza nomes e atributos dos cookies de autenticação.
 * Em produção usa o prefixo `__Host-`, que obriga Secure, Path=/ e ausência de Domain.
 */
@Injectable()
export class AuthCookiesService {
  constructor(private readonly config: AppConfigService) {}

  get sessionCookieName(): string {
    return this.config.isProduction ? '__Host-nexus_session' : 'nexus_session';
  }

  get csrfCookieName(): string {
    return this.config.isProduction ? '__Host-nexus_csrf' : 'nexus_csrf';
  }

  setSession(response: Response, token: string, expiresAt: Date): void {
    response.cookie(this.sessionCookieName, token, {
      ...this.sessionOptions(),
      expires: expiresAt,
    });
  }

  clearSession(response: Response): void {
    response.clearCookie(this.sessionCookieName, this.sessionOptions());
  }

  readSession(request: Request): string | undefined {
    return this.read(request, this.sessionCookieName);
  }

  setCsrf(response: Response, token: string): void {
    response.cookie(this.csrfCookieName, token, {
      httpOnly: false,
      secure: this.config.isProduction,
      sameSite: 'strict',
      path: '/',
    });
  }

  readCsrf(request: Request): string | undefined {
    return this.read(request, this.csrfCookieName);
  }

  private sessionOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: '/',
    };
  }

  private read(request: Request, name: string): string | undefined {
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }
}
