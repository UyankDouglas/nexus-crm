import { describe, expect, it } from 'vitest';
import {
  hasActivityFilters,
  parseActivityFilters,
  serializeActivityFilters,
} from './activity-filters';

describe('filtros de atividades na URL', () => {
  it('descarta tipo e autor inválidos', () => {
    const filters = parseActivityFilters(new URLSearchParams({ type: 'VISITA', author: 'x' }));
    expect(filters).toEqual({
      search: undefined,
      type: undefined,
      author: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(hasActivityFilters(filters)).toBe(false);
  });

  it('mantém os filtros válidos em ida e volta pela URL', () => {
    const query = 'search=proposta&type=MEETING&author=me&page=3';
    const filters = parseActivityFilters(new URLSearchParams(query));
    expect(serializeActivityFilters(filters).toString()).toBe(query);
    expect(hasActivityFilters(filters)).toBe(true);
  });
});
