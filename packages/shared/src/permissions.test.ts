import { describe, expect, it } from 'vitest';
import { hasPermission, permissionsForRole } from './permissions.js';

describe('permissões RBAC', () => {
  it('concede ao administrador todas as permissões', () => {
    expect(permissionsForRole('ADMIN')).toEqual([
      'organization:read',
      'organization:update',
      'members:read',
    ]);
  });

  it('permite ao gestor ver membros, mas não alterar a organização', () => {
    expect(hasPermission('MANAGER', 'members:read')).toBe(true);
    expect(hasPermission('MANAGER', 'organization:update')).toBe(false);
  });

  it('restringe o vendedor às permissões de leitura básicas', () => {
    expect(permissionsForRole('SALES')).toEqual(['organization:read']);
  });
});
