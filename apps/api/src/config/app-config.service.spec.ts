import { ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env';

const BASE = {
  APP_URL: 'https://crm.example.com',
  DATABASE_URL: 'postgresql://nexus:senha@db:5432/nexus_crm',
  CSRF_SECRET: 'segredo-aleatorio-com-mais-de-32-caracteres',
};

function configFor(env: Record<string, string>): AppConfigService {
  return new AppConfigService(new ConfigService(validateEnv({ ...BASE, ...env })));
}

describe('AppConfigService', () => {
  it('liga o Swagger em desenvolvimento e o desliga em produção, salvo pedido explícito', () => {
    expect(configFor({ NODE_ENV: 'development' }).swaggerEnabled).toBe(true);
    expect(configFor({ NODE_ENV: 'production' }).swaggerEnabled).toBe(false);
    expect(configFor({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }).swaggerEnabled).toBe(
      true,
    );
  });

  it('em produção, aceita apenas a origem pública e as origens configuradas', () => {
    const config = configFor({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://admin.example.com',
    });
    expect(config.allowedOrigins).toEqual(['https://crm.example.com', 'https://admin.example.com']);
  });

  it('trata variáveis opcionais vazias como ausentes e valida a URL do SMTP', () => {
    const config = configFor({ NODE_ENV: 'production', SMTP_URL: '', SWAGGER_ENABLED: '' });
    expect(config.smtpUrl).toBeUndefined();
    expect(config.swaggerEnabled).toBe(false);
    expect(() => validateEnv({ ...BASE, SMTP_URL: 'https://smtp.example.com' })).toThrow(
      /SMTP_URL/,
    );
  });

  it('recusa o segredo CSRF de exemplo em produção', () => {
    expect(() =>
      validateEnv({
        ...BASE,
        NODE_ENV: 'production',
        CSRF_SECRET: 'troque-por-um-valor-aleatorio-com-pelo-menos-32-caracteres',
      }),
    ).toThrow(/CSRF_SECRET/);
  });
});
