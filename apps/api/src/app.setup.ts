import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { validationExceptionFactory } from './common/errors/validation-exception.factory';
import { requestContextMiddleware } from './common/middleware/request-context.middleware';
import { AppConfigService } from './config/app-config.service';
import { AuthCookiesService } from './modules/auth/auth-cookies.service';

export const API_PREFIX = 'api';

/** Configuração HTTP compartilhada entre `main.ts` e os testes de integração. */
export function configureApp(app: NestExpressApplication): void {
  const config = app.get(AppConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.set('trust proxy', config.trustProxy);
  app.use(requestContextMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  // Respostas da API carregam dados por usuário/organização: nunca devem ir para cache.
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.enableCors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: validationExceptionFactory,
    }),
  );

  app.enableShutdownHooks();

  if (config.swaggerEnabled) setupSwagger(app);
}

function setupSwagger(app: NestExpressApplication): void {
  const cookies = app.get(AuthCookiesService);
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('NEXUS CRM API')
      .setDescription(
        [
          'API REST do NEXUS CRM.',
          '',
          '- **Autenticação:** sessão em cookie HttpOnly obtida em `POST /api/auth/login`.',
          '- **CSRF:** requisições de escrita exigem o cabeçalho `X-CSRF-Token` com o valor ' +
            'retornado por `GET /api/auth/csrf`.',
          '- **Multi-tenant:** todas as operações usam a organização ativa da sessão.',
        ].join('\n'),
      )
      .setVersion('0.1.0')
      .addCookieAuth(cookies.sessionCookieName, { type: 'apiKey', in: 'cookie' }, 'session')
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-CSRF-Token' }, 'csrf')
      .build(),
  );

  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document, {
    customSiteTitle: 'NEXUS CRM — API',
    swaggerOptions: { withCredentials: true },
  });
}
