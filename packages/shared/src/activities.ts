import { z } from 'zod';

export const ACTIVITY_TYPES = ['CALL', 'MEETING', 'EMAIL', 'NOTE'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: 'Ligação',
  MEETING: 'Reunião',
  EMAIL: 'E-mail',
  NOTE: 'Observação',
};

export const ACTIVITY_LIMITS = {
  subject: 160,
  description: 5000,
} as const;

/**
 * Atividades registram interações que já aconteceram (o que está por vir é uma tarefa).
 * Uma pequena tolerância evita recusar registros por relógios levemente adiantados.
 */
export const ACTIVITY_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function isActivityDateAllowed(value: Date, now = new Date()): boolean {
  return value.getTime() <= now.getTime() + ACTIVITY_FUTURE_TOLERANCE_MS;
}

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

/**
 * Formulário de atividade. `occurredAt` aceita o valor de um `<input type="datetime-local">`
 * (horário local, sem fuso) ou uma data ISO, e é convertido para ISO 8601 em UTC.
 */
export const activitySchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES, { error: 'Selecione o tipo de atividade.' }),
    subject: z
      .string({ error: 'Informe o assunto.' })
      .trim()
      .min(2, 'O assunto deve ter pelo menos 2 caracteres.')
      .max(
        ACTIVITY_LIMITS.subject,
        `O assunto deve ter no máximo ${ACTIVITY_LIMITS.subject} caracteres.`,
      ),
    description: z.preprocess(
      blankToNull,
      z
        .string()
        .trim()
        .max(
          ACTIVITY_LIMITS.description,
          `A descrição deve ter no máximo ${ACTIVITY_LIMITS.description} caracteres.`,
        )
        .nullable()
        .optional(),
    ),
    occurredAt: z
      .string({ error: 'Informe quando a atividade aconteceu.' })
      .refine((value) => !Number.isNaN(Date.parse(value)), 'Informe uma data e hora válidas.')
      .refine(
        (value) => isActivityDateAllowed(new Date(value)),
        'A atividade não pode estar no futuro. Para compromissos, crie uma tarefa.',
      )
      .transform((value) => new Date(value).toISOString()),
    customerId: z.preprocess(blankToNull, z.uuid().nullable().optional()),
    dealId: z.preprocess(blankToNull, z.uuid().nullable().optional()),
  })
  .refine((value) => Boolean(value.customerId || value.dealId), {
    path: ['customerId'],
    message: 'Vincule a atividade a um cliente ou negócio.',
  });

export type ActivityInput = z.output<typeof activitySchema>;
export type ActivityUpdateInput = Partial<Omit<ActivityInput, 'customerId' | 'dealId'>>;
