import { describe, expect, it } from 'vitest';
import { getFirstName, getInitials, greeting } from './format';

describe('formatação', () => {
  it.each([
    ['Ana Ribeiro', 'AR'],
    ['Carlos Eduardo Mendes', 'CM'],
    ['Horizonte Tecnologia (Demo)', 'HT'],
    ['juliana', 'J'],
    ['', '?'],
  ])('gera as iniciais de "%s"', (name, expected) => {
    expect(getInitials(name)).toBe(expected);
  });

  it('extrai o primeiro nome', () => {
    expect(getFirstName('  Ana Ribeiro ')).toBe('Ana');
  });

  it('cumprimenta conforme o horário', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Bom dia');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Boa tarde');
    expect(greeting(new Date(2026, 0, 1, 20))).toBe('Boa noite');
  });
});
