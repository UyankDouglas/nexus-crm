import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema, registerSchema } from './auth.js';

describe('schemas de autenticação', () => {
  it('normaliza o e-mail para minúsculas e remove espaços', () => {
    const result = loginSchema.parse({ email: '  Ana@Empresa.COM ', password: 'x' });
    expect(result.email).toBe('ana@empresa.com');
  });

  it('rejeita e-mail inválido com mensagem em português', () => {
    const result = loginSchema.safeParse({ email: 'ana', password: 'x' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe um e-mail válido.');
  });

  it.each([
    ['curta1', 'A senha deve ter pelo menos 8 caracteres.'],
    ['somenteletras', 'A senha deve conter pelo menos um número.'],
    ['12345678', 'A senha deve conter pelo menos uma letra.'],
  ])('rejeita a senha fraca "%s"', (password, message) => {
    const result = passwordSchema.safeParse(password);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
  });

  it('aceita um cadastro válido', () => {
    const result = registerSchema.safeParse({
      organizationName: 'Horizonte Tecnologia',
      name: 'Ana Souza',
      email: 'ana@horizonte.com',
      password: 'SenhaForte123',
    });
    expect(result.success).toBe(true);
  });
});
