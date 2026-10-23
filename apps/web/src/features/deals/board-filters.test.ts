import { describe, expect, it } from 'vitest';
import { hasBoardFilters, parseBoardFilters, serializeBoardFilters } from './board-filters';

const PIPELINE = '01a16a74-784f-779b-b366-77f8a691a8ed';

describe('filtros do quadro', () => {
  it('lê busca, responsável e funil da URL', () => {
    const filters = parseBoardFilters(
      new URLSearchParams({ search: '  obras ', owner: 'me', pipeline: PIPELINE }),
    );
    expect(filters).toEqual({ search: 'obras', owner: 'me', pipelineId: PIPELINE });
    expect(hasBoardFilters(filters)).toBe(true);
  });

  it('descarta valores inválidos em vez de repassá-los à API', () => {
    const filters = parseBoardFilters(
      new URLSearchParams({ search: '   ', owner: 'todos', pipeline: '1 OR 1=1' }),
    );
    expect(filters).toEqual({ search: undefined, owner: undefined, pipelineId: undefined });
    expect(hasBoardFilters(filters)).toBe(false);
  });

  it('grava apenas os filtros preenchidos', () => {
    expect(serializeBoardFilters({ owner: 'none' }).toString()).toBe('owner=none');
    expect(serializeBoardFilters({}).toString()).toBe('');
  });

  it('não considera a troca de funil um filtro a limpar', () => {
    expect(hasBoardFilters({ pipelineId: PIPELINE })).toBe(false);
  });
});
