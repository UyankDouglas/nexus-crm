import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env';

/** Acesso tipado às variáveis de ambiente já validadas em `validateEnv`. */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get(key, { infer: true });
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.get('NODE_ENV');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.get('PORT');
  }

  get appUrl(): string {
    return this.get('APP_URL');
  }

  /** Origens autorizadas para CORS e para a verificação de Origin em requisições de escrita. */
  get allowedOrigins(): string[] {
    const origins = [new URL(this.appUrl).origin, ...this.get('CORS_ORIGINS')];
    if (!this.isProduction) {
      // Permite usar o "Try it out" do Swagger servido pela própria API em desenvolvimento.
      origins.push(`http://localhost:${this.port}`, `http://127.0.0.1:${this.port}`);
    }
    return Array.from(new Set(origins));
  }

  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }

  get csrfSecret(): string {
    return this.get('CSRF_SECRET');
  }

  get sessionTtlMs(): number {
    return this.get('SESSION_TTL_HOURS') * 60 * 60 * 1000;
  }

  get passwordResetTtlMs(): number {
    return this.get('PASSWORD_RESET_TTL_MINUTES') * 60 * 1000;
  }

  get rateLimitMax(): number {
    return this.get('RATE_LIMIT_MAX');
  }

  get rateLimitAuthMax(): number {
    return this.get('RATE_LIMIT_AUTH_MAX');
  }

  get trustProxy(): number {
    return this.get('TRUST_PROXY');
  }

  get swaggerEnabled(): boolean {
    return this.get('SWAGGER_ENABLED') ?? !this.isProduction;
  }

  get mailOutboxDir(): string {
    return this.get('MAIL_OUTBOX_DIR');
  }

  /** URL do servidor SMTP — contém credenciais e nunca deve ser registrada em log. */
  get smtpUrl(): string | undefined {
    return this.get('SMTP_URL');
  }

  get mailFrom(): string {
    return this.get('MAIL_FROM');
  }
}
