import type { InvitationPreview } from '@nexus/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminService } from '@/services/admin.service';
import { ApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { AcceptInvitationPage } from './accept-invitation-page';

vi.mock('@/services/admin.service', () => ({
  adminService: { previewInvitation: vi.fn(), acceptInvitation: vi.fn() },
}));
vi.mock('@/services/auth.service', () => ({
  authService: { me: vi.fn(), switchOrganization: vi.fn() },
}));

const TOKEN = 'token-do-convite';
const PREVIEW: InvitationPreview = {
  organizationName: 'Horizonte Tecnologia',
  email: 'marina.souza@horizonte.example',
  role: 'SALES',
  invitedBy: 'Ana Ribeiro',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  accountExists: false,
};

function renderAt(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path: '/convite', element: <AcceptInvitationPage /> },
      { path: '/', element: <p>Dashboard</p> },
      { path: '/entrar', element: <p>Tela de login</p> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('AcceptInvitationPage', () => {
  const preview = vi.mocked(adminService.previewInvitation);
  const accept = vi.mocked(adminService.acceptInvitation);

  beforeEach(() => {
    preview.mockReset();
    accept.mockReset();
    vi.mocked(authService.me).mockRejectedValue(
      new ApiError(401, 'UNAUTHENTICATED', 'Sem sessão.'),
    );
  });

  it('avisa quando o link não traz o token', () => {
    renderAt('/convite');

    expect(screen.getByText('Convite indisponível')).toBeInTheDocument();
    expect(screen.getByText(/link do convite está incompleto/)).toBeInTheDocument();
    expect(preview).not.toHaveBeenCalled();
  });

  it('mostra o motivo quando o convite expirou ou já foi usado', async () => {
    preview.mockRejectedValue(
      new ApiError(400, 'INVALID_INVITATION', 'Este convite expirou ou já foi utilizado.'),
    );
    renderAt(`/convite?token=${TOKEN}`);

    expect(
      await screen.findByText('Este convite expirou ou já foi utilizado.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute(
      'href',
      '/entrar',
    );
  });

  it('cria a conta com nome e senha e entra na organização', async () => {
    const user = userEvent.setup();
    preview.mockResolvedValue(PREVIEW);
    accept.mockResolvedValue({
      organizationId: 'org-1',
      organizationName: PREVIEW.organizationName,
      accountCreated: true,
      signedIn: true,
    });
    renderAt(`/convite?token=${TOKEN}`);

    expect(
      await screen.findByRole('heading', { name: 'Convite para Horizonte Tecnologia' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Ana Ribeiro convidou marina\.souza@horizonte\.example/),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText('Seu nome'), 'Marina Souza');
    await user.type(screen.getByLabelText('Crie uma senha'), 'SenhaForte1');
    await user.type(screen.getByLabelText('Confirme a senha'), 'SenhaForte2');
    await user.click(screen.getByRole('button', { name: 'Criar conta e entrar' }));
    expect(await screen.findByText('As senhas não conferem.')).toBeInTheDocument();
    expect(accept).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Confirme a senha'));
    await user.type(screen.getByLabelText('Confirme a senha'), 'SenhaForte1');
    await user.click(screen.getByRole('button', { name: 'Criar conta e entrar' }));

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    // A confirmação fica no navegador: a API recebe apenas o token, o nome e a senha.
    expect(accept).toHaveBeenCalledWith({
      token: TOKEN,
      name: 'Marina Souza',
      password: 'SenhaForte1',
    });
  });

  it('para quem já tem conta, só confirma e orienta a entrar com o e-mail convidado', async () => {
    const user = userEvent.setup();
    preview.mockResolvedValue({ ...PREVIEW, accountExists: true });
    accept.mockResolvedValue({
      organizationId: 'org-1',
      organizationName: PREVIEW.organizationName,
      accountCreated: false,
      signedIn: false,
    });
    renderAt(`/convite?token=${TOKEN}`);

    await user.click(await screen.findByRole('button', { name: 'Aceitar convite' }));

    expect(await screen.findByText(/Convite aceito!/)).toBeInTheDocument();
    expect(accept).toHaveBeenCalledWith({ token: TOKEN });
    expect(screen.queryByLabelText('Crie uma senha')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Entrar com marina.souza@horizonte.example' }),
    ).toHaveAttribute('href', '/entrar');
  });
});
