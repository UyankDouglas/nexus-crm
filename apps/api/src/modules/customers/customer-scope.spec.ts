import type { MemberRole } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { canAssignCustomers, customerScope } from './customer-scope';

function authAs(role: MemberRole): TenantAuthContext {
  return {
    user: { id: 'user-1', name: 'Usuário', email: 'usuario@alpha.example' },
    session: { id: 's1', createdAt: new Date(), expiresAt: new Date() },
    organization: { id: 'org-1', name: 'Alpha', slug: 'alpha' },
    membership: { id: 'm1', role },
  };
}

describe('customerScope', () => {
  it.each<MemberRole>(['ADMIN', 'MANAGER'])(
    '%s enxerga todos os clientes da organização',
    (role) => {
      expect(customerScope(authAs(role))).toEqual({ organizationId: 'org-1' });
    },
  );

  it('vendedor enxerga apenas os clientes dos quais é responsável', () => {
    expect(customerScope(authAs('SALES'))).toEqual({ organizationId: 'org-1', ownerId: 'user-1' });
  });

  it('somente administradores e gestores distribuem clientes', () => {
    expect(canAssignCustomers(authAs('ADMIN'))).toBe(true);
    expect(canAssignCustomers(authAs('MANAGER'))).toBe(true);
    expect(canAssignCustomers(authAs('SALES'))).toBe(false);
  });
});
