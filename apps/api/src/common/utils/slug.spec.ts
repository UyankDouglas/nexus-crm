import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Vértice Consultoria', 'vertice-consultoria'],
    ['  Horizonte   Tecnologia (Demo) ', 'horizonte-tecnologia-demo'],
    ['Ação & Cia. Ltda.', 'acao-cia-ltda'],
    ['!!!', 'organizacao'],
  ])('converte "%s" em "%s"', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('limita o tamanho sem terminar em hífen', () => {
    const slug = slugify(`${'a'.repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith('-')).toBe(false);
  });
});
