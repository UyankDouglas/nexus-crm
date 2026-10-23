import { describe, expect, it } from 'vitest';
import { contactSchema, customerSchema, normalizeTags } from './customers.js';

const base = {
  type: 'COMPANY' as const,
  name: 'Horizonte Tecnologia',
  status: 'LEAD' as const,
  tags: [],
};

describe('normalizeTags', () => {
  it('remove espaços extras e duplicatas sem diferenciar maiúsculas', () => {
    expect(normalizeTags(['  Varejo ', 'varejo', 'Grande   conta', '', 'SP'])).toEqual([
      'Varejo',
      'Grande conta',
      'SP',
    ]);
  });
});

describe('customerSchema', () => {
  it('normaliza campos opcionais vazios para null e o documento sem pontuação', () => {
    const result = customerSchema.parse({
      ...base,
      tradeName: '  ',
      email: ' Contato@Horizonte.Example ',
      phone: '(11) 98765-4321',
      document: '11.222.333/0001-81',
      website: '',
    });

    expect(result).toMatchObject({
      tradeName: null,
      email: 'contato@horizonte.example',
      phone: '11987654321',
      document: '11222333000181',
      website: null,
    });
  });

  it('valida o documento conforme o tipo de cliente', () => {
    const cpfInCompany = customerSchema.safeParse({ ...base, document: '529.982.247-25' });
    expect(cpfInCompany.error?.issues[0]).toMatchObject({
      path: ['document'],
      message: 'Informe um CNPJ válido.',
    });

    const person = customerSchema.safeParse({
      ...base,
      type: 'PERSON',
      name: 'Maria Souza',
      document: '529.982.247-25',
    });
    expect(person.success).toBe(true);
  });

  it('só permite empresa vinculada para pessoa física', () => {
    const result = customerSchema.safeParse({
      ...base,
      companyId: '01900000-0000-7000-8000-000000000000',
    });
    expect(result.error?.issues[0]?.path).toEqual(['companyId']);
  });

  it('limita a quantidade de tags', () => {
    const tags = Array.from({ length: 11 }, (_, index) => `tag ${index}`);
    expect(customerSchema.safeParse({ ...base, tags }).success).toBe(false);
  });

  it.each([
    ['phone', '1234', 'Informe o telefone com DDD.'],
    ['website', 'ftp://site.example', 'Informe um endereço começando com http(s)://'],
    ['email', 'invalido', 'Informe um e-mail válido.'],
  ])('rejeita %s inválido', (field, value, message) => {
    const result = customerSchema.safeParse({ ...base, [field]: value });
    expect(result.error?.issues[0]?.message).toBe(message);
  });
});

describe('contactSchema', () => {
  it('aceita contato com campos opcionais vazios', () => {
    const result = contactSchema.parse({
      name: 'Paula Ramos',
      email: '',
      phone: '',
      position: 'Compras',
      isPrimary: true,
    });
    expect(result).toMatchObject({ email: null, phone: null, position: 'Compras' });
  });
});
