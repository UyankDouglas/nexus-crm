import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AUTH_RATE_LIMIT_KEY } from './common/auth/auth.decorators';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AuthGuard } from './common/guards/auth.guard';
import { CsrfGuard } from './common/guards/csrf.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DealsModule } from './modules/deals/deals.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    MailModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        throttlers: [
          { name: 'default', ttl: ONE_MINUTE_MS, limit: config.rateLimitMax },
          {
            // Limite mais restrito, aplicado somente às rotas marcadas com @AuthRateLimit().
            name: 'auth',
            ttl: ONE_MINUTE_MS,
            limit: config.rateLimitAuthMax,
            skipIf: (context) =>
              Reflect.getMetadata(AUTH_RATE_LIMIT_KEY, context.getHandler()) !== true,
          },
        ],
      }),
    }),
    AuthModule,
    OrganizationsModule,
    CustomersModule,
    DealsModule,
    TasksModule,
    ActivitiesModule,
    DashboardModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // A ordem importa: limite de requisições → CSRF → autenticação → permissões.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
