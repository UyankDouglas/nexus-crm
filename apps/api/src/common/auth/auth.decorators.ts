import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission } from '@nexus/shared';
import type { Request } from 'express';
import { AppException } from '../errors/app.exception';
import type { AuthContext, TenantAuthContext } from './auth-context';

export const IS_PUBLIC_KEY = 'auth:isPublic';
export const ALLOW_WITHOUT_ORGANIZATION_KEY = 'auth:allowWithoutOrganization';
export const REQUIRED_PERMISSIONS_KEY = 'auth:requiredPermissions';
export const AUTH_RATE_LIMIT_KEY = 'auth:rateLimit';

/** Rota acessível sem sessão. Por padrão, todas as rotas exigem autenticação. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Rota autenticada que não exige organização ativa (ex.: `/auth/me`, troca de organização). */
export const AllowWithoutOrganization = () => SetMetadata(ALLOW_WITHOUT_ORGANIZATION_KEY, true);

/** Exige que o perfil do usuário na organização ativa possua todas as permissões listadas. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);

/** Aplica o limite de requisições mais restrito dos endpoints sensíveis de autenticação. */
export const AuthRateLimit = () => SetMetadata(AUTH_RATE_LIMIT_KEY, true);

function getAuth(context: ExecutionContext): AuthContext {
  const auth = context.switchToHttp().getRequest<Request>().auth;
  if (!auth) throw AppException.unauthenticated();
  return auth;
}

/** Contexto autenticado (organização pode ser nula em rotas `@AllowWithoutOrganization`). */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext => getAuth(context),
);

/** Contexto autenticado com organização ativa garantida pelo AuthGuard. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantAuthContext => {
    const auth = getAuth(context);
    if (!auth.organization || !auth.membership) {
      throw AppException.forbidden('Selecione uma organização para continuar.');
    }
    return auth as TenantAuthContext;
  },
);
