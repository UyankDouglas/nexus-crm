import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { AppConfigService } from '../../config/app-config.service';
import { generateToken, safeEqual } from '../../common/security/tokens';

/**
 * Proteção CSRF no padrão "signed double-submit cookie" (OWASP):
 * o token `nonce.assinatura` vai em um cookie legível pelo frontend e deve ser
 * reenviado no cabeçalho `X-CSRF-Token`. A assinatura HMAC impede que um atacante
 * capaz de gravar cookies forje um token válido sem conhecer o segredo.
 */
@Injectable()
export class CsrfService {
  constructor(private readonly config: AppConfigService) {}

  generate(): string {
    const nonce = generateToken(24);
    return `${nonce}.${this.sign(nonce)}`;
  }

  isValid(token: string | undefined): token is string {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [nonce, signature] = parts as [string, string];
    return nonce.length > 0 && safeEqual(signature, this.sign(nonce));
  }

  verify(cookieToken: string | undefined, headerToken: string | undefined): boolean {
    return (
      this.isValid(cookieToken) && headerToken !== undefined && safeEqual(cookieToken, headerToken)
    );
  }

  private sign(nonce: string): string {
    return createHmac('sha256', this.config.csrfSecret).update(nonce).digest('base64url');
  }
}
