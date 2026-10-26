import type { Permission } from '@nexus/shared';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { useCanSee } from '@/features/auth/hooks';
import { SettingsPage } from './settings-page';

vi.mock('@/features/auth/hooks', () => ({
  useCanSee: vi.fn(),
  usePermission: () => false,
}));
// Os painéis têm testes e dados próprios; aqui interessa apenas quais abas cada perfil vê.
vi.mock('@/features/admin/components/audit-panel', () => ({ AuditPanel: () => null }));
vi.mock('@/features/admin/components/invitations-panel', () => ({ InvitationsPanel: () => null }));
vi.mock('@/features/admin/components/members-panel', () => ({
  MembersPanel: () => <p>Membros</p>,
}));
vi.mock('@/features/admin/components/permissions-panel', () => ({ PermissionsPanel: () => null }));
vi.mock('@/features/admin/components/pipelines-panel', () => ({ PipelinesPanel: () => null }));
vi.mock('@/features/organization/hooks', () => ({
  useOrganizationSummary: () => ({ isPending: true }),
}));

function renderAs(permissions: Permission[], path = '/configuracoes') {
  vi.mocked(useCanSee).mockReturnValue(
    (item) => !item.permission || permissions.includes(item.permission),
  );
  render(
    <MemoryRouter initialEntries={[path]}>
      <SettingsPage />
    </MemoryRouter>,
  );
  return screen.getAllByRole('tab').map((tab) => tab.textContent);
}

describe('SettingsPage', () => {
  it('administradores veem convites, funis e auditoria', () => {
    expect(renderAs(['members:manage', 'pipelines:manage', 'audit:read'])).toEqual([
      'Organização',
      'Membros',
      'Convites',
      'Funis',
      'Permissões',
      'Auditoria',
    ]);
  });

  it('gestores e vendedores veem apenas as abas de consulta', () => {
    expect(renderAs([])).toEqual(['Organização', 'Membros', 'Permissões']);
  });

  it('abre a aba indicada na URL e ignora abas que o perfil não pode ver', () => {
    renderAs([], '/configuracoes?aba=membros');
    expect(screen.getByRole('tab', { name: 'Membros' })).toHaveAttribute('aria-selected', 'true');
  });

  it('volta à primeira aba quando a URL aponta para uma aba restrita', () => {
    renderAs([], '/configuracoes?aba=auditoria');
    expect(screen.getByRole('tab', { name: 'Organização' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
