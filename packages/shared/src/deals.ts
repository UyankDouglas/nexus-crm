import { z } from 'zod';

export const DEAL_STATUSES = ['OPEN', 'WON', 'LOST'] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  OPEN: 'Em andamento',
  WON: 'Ganho',
  LOST: 'Perdido',
};

/** Tipo da etapa: etapas de encerramento definem o status do negócio. */
export const STAGE_KINDS = ['OPEN', 'WON', 'LOST'] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export interface DefaultStage {
  name: string;
  kind: StageKind;
  /** Probabilidade de fechamento usada em previsões (0–100). */
  probability: number;
}

/** Funil criado para toda nova organização (a migration aplica o mesmo às existentes). */
export const DEFAULT_PIPELINE_NAME = 'Funil de vendas';
export const DEFAULT_PIPELINE_STAGES: readonly DefaultStage[] = [
  { name: 'Novo lead', kind: 'OPEN', probability: 10 },
  { name: 'Primeiro contato', kind: 'OPEN', probability: 20 },
  { name: 'Qualificação', kind: 'OPEN', probability: 40 },
  { name: 'Proposta enviada', kind: 'OPEN', probability: 60 },
  { name: 'Negociação', kind: 'OPEN', probability: 80 },
  { name: 'Ganho', kind: 'WON', probability: 100 },
  { name: 'Perdido', kind: 'LOST', probability: 0 },
];

export const LOST_REASON_SUGGESTIONS = [
  'Preço acima do orçamento',
  'Escolheu um concorrente',
  'Sem orçamento no momento',
  'Sem resposta do cliente',
  'Projeto adiado ou cancelado',
  'Necessidade não atendida',
] as const;

export const DEAL_LIMITS = {
  title: 160,
  notes: 5000,
  lostReason: 500,
  maxValue: 999_999_999_999.99,
} as const;

/** Negócios encerrados aparecem no quadro por este período após o fechamento. */
export const BOARD_CLOSED_WINDOW_DAYS = 30;

export const DEAL_SORTS = ['recent', 'value', 'closeDate', 'updated'] as const;
export type DealSort = (typeof DEAL_SORTS)[number];

// ---------------------------------------------------------------------------
// Datas sem horário (AAAA-MM-DD) e valores monetários
// ---------------------------------------------------------------------------

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Valida datas de calendário reais no formato AAAA-MM-DD (rejeita 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Converte texto digitado em reais para número: "1.234,56", "R$ 1234,5", "1234.56" → 1234.56.
 * Retorna `null` quando não é um valor válido.
 */
export function parseCurrency(input: string): number | null {
  const cleaned = input.replace(/[R$\s]/g, '');
  if (!cleaned) return null;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, '') // "1.234.567" = separador de milhar
      : cleaned;
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Schemas Zod (formulários do frontend). A API valida as mesmas regras com DTOs.
// ---------------------------------------------------------------------------

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const dealValueSchema = z.preprocess(
  (value) => (typeof value === 'string' ? (parseCurrency(value) ?? value) : value),
  z
    .number({ error: 'Informe um valor válido.' })
    .min(0, 'O valor não pode ser negativo.')
    .max(DEAL_LIMITS.maxValue, 'Valor muito alto.'),
);

export const dealSchema = z.object({
  title: z
    .string({ error: 'Informe o nome do negócio.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(DEAL_LIMITS.title, `O nome deve ter no máximo ${DEAL_LIMITS.title} caracteres.`),
  customerId: z.uuid('Selecione o cliente.'),
  stageId: z.preprocess(blankToNull, z.uuid().nullable().optional()),
  value: dealValueSchema,
  expectedCloseDate: z.preprocess(
    blankToNull,
    z.string().refine(isValidIsoDate, 'Informe uma data válida.').nullable().optional(),
  ),
  ownerId: z.preprocess(blankToNull, z.uuid().nullable().optional()),
  notes: z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(DEAL_LIMITS.notes, `As observações devem ter no máximo ${DEAL_LIMITS.notes} caracteres.`)
      .nullable()
      .optional(),
  ),
});

export type DealInput = z.output<typeof dealSchema>;
/** Etapa e status mudam somente pela movimentação (`POST /deals/:id/move`). */
export type DealUpdateInput = Partial<Omit<DealInput, 'stageId'>>;

export const lostReasonSchema = z
  .string({ error: 'Informe o motivo da perda.' })
  .trim()
  .min(3, 'Descreva o motivo com pelo menos 3 caracteres.')
  .max(DEAL_LIMITS.lostReason, `O motivo deve ter no máximo ${DEAL_LIMITS.lostReason} caracteres.`);

export interface DealMoveInput {
  stageId: string;
  /** Posiciona o negócio logo após este (mesma etapa); `null` coloca no topo da coluna. */
  afterDealId?: string | null;
  /** Obrigatório ao mover para uma etapa de perda. */
  lostReason?: string;
}
