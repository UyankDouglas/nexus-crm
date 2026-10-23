import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MemberRole, Permission } from '@nexus/shared';
import { AppException } from '../errors/app.exception';
import { PermissionsGuard } from './permissions.guard';

function contextFor(role: MemberRole | null): ExecutionContext {
  const request = { auth: role ? { membership: { id: 'm1', role } } : undefined };
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  const reflector = new Reflector();
  const guard = new PermissionsGuard(reflector);

  function requirePermissions(permissions: Permission[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(permissions);
  }

  it('libera rotas sem permissões declaradas', () => {
    requirePermissions(undefined);
    expect(guard.canActivate(contextFor('SALES'))).toBe(true);
  });

  it('libera quando o perfil possui a permissão', () => {
    requirePermissions(['members:read']);
    expect(guard.canActivate(contextFor('MANAGER'))).toBe(true);
  });

  it('nega quando o perfil não possui a permissão', () => {
    requirePermissions(['organization:update']);
    expect(() => guard.canActivate(contextFor('MANAGER'))).toThrow(AppException);
  });

  it('nega quando não há vínculo com a organização', () => {
    requirePermissions(['organization:read']);
    expect(() => guard.canActivate(contextFor(null))).toThrow(AppException);
  });
});
