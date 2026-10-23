import { describe, expect, it } from 'vitest';
import {
  hasActiveFilters,
  parseCustomerFilters,
  serializeCustomerFilters,
} from './customer-filters';

const parse = (query: string) => parseCustomerFilters(new URLSearchParams(query));

describe('filtros de clientes na URL', () => {
  it('usa os valores padrão quando a URL está vazia', () => {
    expect(parse('')).toEqual({
      search: undefined,
      status: undefined,
      type: undefined,
      owner: undefined,
      tag: undefined,
      page: 1,
      pageSize: 20,
      sort: 'name',
    });
  });

  it('lê filtros válidos', () => {
    expect(
      parse(
        'search=aurora&status=ACTIVE&type=COMPANY&owner=none&tag=Varejo&page=2&pageSize=50&sort=recent',
      ),
    ).toMatchObject({
      search: 'aurora',
      status: 'ACTIVE',
      type: 'COMPANY',
      owner: 'none',
      tag: 'Varejo',
      page: 2,
      pageSize: 50,
      sort: 'recent',
    });
  });

  it('descarta valores inválidos em vez de repassá-los à API', () => {
    expect(
      parse('status=QUALQUER&type=x&owner=admin&page=-3&pageSize=999&sort=drop+table'),
    ).toMatchObject({
      status: undefined,
      type: undefined,
      owner: undefined,
      page: 1,
      pageSize: 20,
      sort: 'name',
    });
  });

  it('aceita o ID de um responsável no formato UUID', () => {
    const id = '01a16a0f-cc2c-734c-b19c-17b1ce2e79ca';
    expect(parse(`owner=${id}`).owner).toBe(id);
  });

  it('grava apenas o que difere do padrão', () => {
    const query = serializeCustomerFilters({
      search: 'gaia',
      page: 1,
      pageSize: 20,
      sort: 'name',
    });
    expect(query.toString()).toBe('search=gaia');
  });

  it('ida e volta preserva os filtros', () => {
    const filters = parse('status=LEAD&tag=Agro&page=3&sort=updated');
    expect(parseCustomerFilters(serializeCustomerFilters(filters))).toEqual(filters);
  });

  it('identifica filtros ativos (paginação e ordenação não contam)', () => {
    expect(hasActiveFilters(parse('page=4&sort=recent'))).toBe(false);
    expect(hasActiveFilters(parse('tag=Varejo'))).toBe(true);
  });
});
