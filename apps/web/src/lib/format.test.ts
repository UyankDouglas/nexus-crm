import { describe, expect, it } from 'vitest';
import { formatRelative, getFirstName, getInitials, greeting } from './format';

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

  it('formata datas relativas em português', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    expect(formatRelative('2026-10-23T11:59:40Z', now)).toBe('agora');
    expect(formatRelative('2026-10-22T12:00:00Z', now)).toBe('ontem');
    expect(formatRelative('2026-10-20T12:00:00Z', now)).toBe('há 3 dias');
    expect(formatRelative('2026-07-23T12:00:00Z', now)).toBe('há 3 meses');
  });
});
