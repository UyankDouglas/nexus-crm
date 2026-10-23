import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSIONS,
  hasPermission,
  PERMISSION_LABELS,
  permissionsForRole,
} from './permissions.js';

describe('permissões RBAC', () => {
  it('concede ao administrador todas as permissões', () => {
    expect(permissionsForRole('ADMIN')).toEqual(ALL_PERMISSIONS);
  });

  it('permite ao gestor ver membros e distribuir clientes, mas não alterar a organização', () => {
    expect(hasPermission('MANAGER', 'members:read')).toBe(true);
    expect(hasPermission('MANAGER', 'customers:assign')).toBe(true);
    expect(hasPermission('MANAGER', 'customers:read-all')).toBe(true);
    expect(hasPermission('MANAGER', 'organization:update')).toBe(false);
  });

  it('restringe o vendedor aos próprios clientes, sem distribuir ou excluir', () => {
    expect(permissionsForRole('SALES')).toEqual([
      'organization:read',
      'customers:read',
      'customers:create',
      'customers:update',
    ]);
  });

  it('possui rótulo em português para cada permissão', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(PERMISSION_LABELS[permission]).toBeTruthy();
    }
  });
});
