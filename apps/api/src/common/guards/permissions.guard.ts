import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type Permission } from '@nexus/shared';
import type { Request } from 'express';
import { REQUIRED_PERMISSIONS_KEY } from '../auth/auth.decorators';
import { AppException } from '../errors/app.exception';

/** Verifica as permissões RBAC declaradas com `@RequirePermissions()` na organização ativa. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const role = context.switchToHttp().getRequest<Request>().auth?.membership?.role;
    if (!role || !required.every((permission) => hasPermission(role, permission))) {
      throw AppException.forbidden();
    }

    return true;
  }
}
