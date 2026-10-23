import type { MeResponse } from '@nexus/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { GuestRoute, ProtectedRoute } from './route-guards';

vi.mock('@/services/auth.service', () => ({ authService: { me: vi.fn() } }));

const me: MeResponse = {
  user: { id: 'u1', name: 'Ana Ribeiro', email: 'ana@alpha.example' },
  memberships: [
    { organizationId: 'o1', organizationName: 'Alpha', organizationSlug: 'alpha', role: 'ADMIN' },
  ],
  activeOrganization: {
    id: 'o1',
    name: 'Alpha',
    slug: 'alpha',
    role: 'ADMIN',
    permissions: ['organization:read'],
  },
  session: { createdAt: new Date().toISOString(), expiresAt: new Date().toISOString() },
};

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <GuestRoute />,
        children: [{ path: '/entrar', element: <p>Tela de login</p> }],
      },
      {
        element: <ProtectedRoute requireOrganization={false} />,
        children: [{ path: '/selecionar-organizacao', element: <p>Seleção de organização</p> }],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/', element: <p>Dashboard</p> },
          { path: '/clientes', element: <p>Clientes</p> },
        ],
      },
    ],
    { initialEntries: [path] },
  );
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

describe('proteção de rotas', () => {
  const meMock = vi.mocked(authService.me);

  beforeEach(() => {
    meMock.mockReset();
  });

  it('redireciona visitantes para o login preservando o destino', async () => {
    meMock.mockImplementation(() =>
      Promise.reject(new ApiError(401, 'UNAUTHENTICATED', 'Faça login')),
    );
    const router = renderAt('/clientes');

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?redirect=%2Fclientes');
  });

  it('libera rotas protegidas para usuários autenticados', async () => {
    meMock.mockResolvedValue(me);
    renderAt('/clientes');
    expect(await screen.findByText('Clientes')).toBeInTheDocument();
  });

  it('exige a escolha de organização quando nenhuma está ativa', async () => {
    meMock.mockResolvedValue({ ...me, activeOrganization: null });
    renderAt('/');
    expect(await screen.findByText('Seleção de organização')).toBeInTheDocument();
  });

  it('envia usuários autenticados da tela de login para o sistema', async () => {
    meMock.mockResolvedValue(me);
    renderAt('/entrar');
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('exibe erro com opção de tentar novamente quando a API está indisponível', async () => {
    meMock.mockImplementation(() =>
      Promise.reject(new ApiError(0, 'NETWORK_ERROR', 'Não foi possível conectar ao servidor.')),
    );
    renderAt('/');
    expect(await screen.findByText('Não foi possível conectar ao servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});
