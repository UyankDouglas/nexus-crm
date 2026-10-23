import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PIPELINE_STAGES,
  dealSchema,
  isValidIsoDate,
  lostReasonSchema,
  parseCurrency,
} from './deals.js';

const CUSTOMER_ID = '01a16a4f-38ec-7623-be0f-22cb6ee9bf80';

describe('parseCurrency', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['R$ 1.234,5', 1234.5],
    ['1234.56', 1234.56],
    ['1.234.567', 1234567],
    ['0,99', 0.99],
    ['15000', 15000],
  ])('converte "%s" em %d', (input, expected) => {
    expect(parseCurrency(input)).toBe(expected);
  });

  it.each(['', 'abc', '1,2,3', '12,345'])('rejeita "%s"', (input) => {
    expect(parseCurrency(input)).toBeNull();
  });
});

describe('isValidIsoDate', () => {
  it('aceita datas de calendário reais', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('2028-02-29')).toBe(true);
  });

  it.each(['2026-02-30', '2026-13-01', '23/10/2026', '2026-1-1'])('rejeita %s', (value) => {
    expect(isValidIsoDate(value)).toBe(false);
  });
});

describe('dealSchema', () => {
  it('aceita valor digitado em reais e campos opcionais vazios', () => {
    const result = dealSchema.parse({
      title: '  Renovação anual ',
      customerId: CUSTOMER_ID,
      value: '12.500,00',
      expectedCloseDate: '',
      notes: '',
    });
    expect(result).toMatchObject({
      title: 'Renovação anual',
      value: 12500,
      expectedCloseDate: null,
      notes: null,
    });
  });

  it('rejeita valor negativo e data inválida', () => {
    const result = dealSchema.safeParse({
      title: 'Projeto',
      customerId: CUSTOMER_ID,
      value: '-10',
      expectedCloseDate: '2026-02-30',
    });
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining(['O valor não pode ser negativo.', 'Informe uma data válida.']),
    );
  });

  it('exige um motivo de perda descritivo', () => {
    expect(lostReasonSchema.safeParse('ok').success).toBe(false);
    expect(lostReasonSchema.safeParse('Escolheu um concorrente').success).toBe(true);
  });
});

describe('funil padrão', () => {
  it('tem etapas abertas seguidas de ganho e perda', () => {
    expect(DEFAULT_PIPELINE_STAGES.map((stage) => stage.name)).toEqual([
      'Novo lead',
      'Primeiro contato',
      'Qualificação',
      'Proposta enviada',
      'Negociação',
      'Ganho',
      'Perdido',
    ]);
    expect(DEFAULT_PIPELINE_STAGES.filter((stage) => stage.kind !== 'OPEN')).toHaveLength(2);
  });
});
