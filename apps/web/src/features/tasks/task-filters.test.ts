import { describe, expect, it } from 'vitest';
import { hasTaskFilters, parseTaskFilters, serializeTaskFilters } from './task-filters';

describe('filtros de tarefas na URL', () => {
  it('usa pendentes e prazo como padrão e descarta valores inválidos', () => {
    const filters = parseTaskFilters(
      new URLSearchParams({ status: 'qualquer', due: 'ontem', assignee: 'todos', sort: 'x' }),
    );
    expect(filters).toEqual({
      search: undefined,
      status: 'open',
      due: undefined,
      priority: undefined,
      assignee: undefined,
      page: 1,
      pageSize: 20,
      sort: 'due',
    });
    expect(hasTaskFilters(filters)).toBe(false);
  });

  it('preserva os filtros válidos em ida e volta pela URL', () => {
    const query = 'status=DONE&due=overdue&priority=HIGH&assignee=me&page=2&sort=priority';
    const filters = parseTaskFilters(new URLSearchParams(query));
    expect(filters).toMatchObject({ status: 'DONE', due: 'overdue', priority: 'HIGH', page: 2 });
    expect(serializeTaskFilters(filters).toString()).toBe(query);
    expect(hasTaskFilters(filters)).toBe(true);
  });
});
