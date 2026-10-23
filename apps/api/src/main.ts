import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { API_PREFIX, configureApp } from './app.setup';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const config = app.get(AppConfigService);
  await app.listen(config.port);

  const baseUrl = `http://localhost:${config.port}/${API_PREFIX}`;
  Logger.log(`API disponível em ${baseUrl}`, 'Bootstrap');
  if (config.swaggerEnabled) Logger.log(`Documentação em ${baseUrl}/docs`, 'Bootstrap');
}

void bootstrap();
