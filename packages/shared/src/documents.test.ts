import { describe, expect, it } from 'vitest';
import {
  completeCnpj,
  completeCpf,
  formatCnpj,
  formatCpf,
  formatDocument,
  formatPhone,
  isValidCnpj,
  isValidCpf,
  normalizeDocument,
} from './documents.js';

describe('CPF', () => {
  it.each(['529.982.247-25', '52998224725', '111.444.777-35'])('aceita %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(true);
  });

  it.each(['529.982.247-24', '111.111.111-11', '123', ''])('rejeita %s', (cpf) => {
    expect(isValidCpf(cpf)).toBe(false);
  });

  it('calcula os dígitos verificadores e formata', () => {
    expect(completeCpf('529982247')).toBe('52998224725');
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });
});

describe('CNPJ', () => {
  it('aceita CNPJ numérico tradicional', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('aceita CNPJ alfanumérico (exemplo oficial da Receita Federal)', () => {
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true);
    expect(completeCnpj('12ABC34501DE')).toBe('12ABC34501DE35');
  });

  it('aceita letras minúsculas, normalizando para maiúsculas', () => {
    expect(normalizeDocument('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(isValidCnpj('12.abc.345/01de-35')).toBe(true);
  });

  it.each(['11.222.333/0001-82', '00.000.000/0000-00', '12.ABC.345/01DE-3X', '1122233300018'])(
    'rejeita %s',
    (cnpj) => {
      expect(isValidCnpj(cnpj)).toBe(false);
    },
  );

  it('formata CNPJ numérico e alfanumérico', () => {
    expect(formatCnpj('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });
});

describe('telefone', () => {
  it.each([
    ['11987654321', '(11) 98765-4321'],
    ['1134567890', '(11) 3456-7890'],
    ['5511987654321', '+5511987654321'],
  ])('formata %s', (phone, expected) => {
    expect(formatPhone(phone)).toBe(expected);
  });
});
