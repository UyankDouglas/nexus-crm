import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api-client';
import { authService } from '@/services/auth.service';
import { LoginForm } from './login-form';

vi.mock('@/services/auth.service', () => ({ authService: { login: vi.fn() } }));

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  const loginMock = vi.mocked(authService.login);

  beforeEach(() => {
    loginMock.mockReset();
  });

  it('valida os campos antes de chamar a API', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText('E-mail'), 'email-invalido');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('envia o e-mail normalizado e exibe o erro retornado pela API', async () => {
    const user = userEvent.setup();
    loginMock.mockImplementation(() =>
      Promise.reject(new ApiError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.')),
    );
    renderForm();

    await user.type(screen.getByLabelText('E-mail'), '  Ana@Alpha.example ');
    await user.type(screen.getByLabelText('Senha'), 'SenhaErrada1');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(loginMock).toHaveBeenCalledWith({
      email: 'ana@alpha.example',
      password: 'SenhaErrada1',
    });
    expect(screen.getByLabelText('Senha')).toHaveValue('');
  });

  it('permite exibir e ocultar a senha', async () => {
    const user = userEvent.setup();
    renderForm();
    const password = screen.getByLabelText('Senha');

    expect(password).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(password).toHaveAttribute('type', 'text');
  });
});
