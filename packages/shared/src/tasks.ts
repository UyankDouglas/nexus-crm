import { z } from 'zod';
import { isValidIsoDate } from './deals.js';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluída',
  CANCELED: 'Cancelada',
};

/** Status que ainda exigem ação (contam como pendentes e podem ficar atrasados). */
export const OPEN_TASK_STATUSES = ['TODO', 'IN_PROGRESS'] as const satisfies readonly TaskStatus[];

export function isOpenTaskStatus(status: TaskStatus): boolean {
  return (OPEN_TASK_STATUSES as readonly TaskStatus[]).includes(status);
}

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
};

export const TASK_LIMITS = {
  title: 160,
  description: 5000,
} as const;

/** Filtro de status da listagem: `open` reúne "a fazer" e "em andamento". */
export const TASK_STATUS_FILTERS = ['open', ...TASK_STATUSES, 'all'] as const;
export type TaskStatusFilter = (typeof TASK_STATUS_FILTERS)[number];

export const TASK_STATUS_FILTER_LABELS: Record<TaskStatusFilter, string> = {
  open: 'Pendentes',
  ...TASK_STATUS_LABELS,
  all: 'Todos os status',
};

/** Filtro de prazo, sempre aplicado sobre tarefas pendentes. */
export const TASK_DUE_FILTERS = ['overdue', 'today', 'week'] as const;
export type TaskDueFilter = (typeof TASK_DUE_FILTERS)[number];

export const TASK_DUE_FILTER_LABELS: Record<TaskDueFilter, string> = {
  overdue: 'Atrasadas',
  today: 'Vencem hoje',
  week: 'Próximos 7 dias',
};

export const TASK_SORTS = ['due', 'priority', 'recent'] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

export const TASK_SORT_LABELS: Record<TaskSort, string> = {
  due: 'Prazo mais próximo',
  priority: 'Maior prioridade',
  recent: 'Cadastro mais recente',
};

// ---------------------------------------------------------------------------
// Schemas Zod (formulários do frontend). A API valida as mesmas regras com DTOs.
// ---------------------------------------------------------------------------

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

export const taskSchema = z.object({
  title: z
    .string({ error: 'Informe o título da tarefa.' })
    .trim()
    .min(2, 'O título deve ter pelo menos 2 caracteres.')
    .max(TASK_LIMITS.title, `O título deve ter no máximo ${TASK_LIMITS.title} caracteres.`),
  description: z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(
        TASK_LIMITS.description,
        `A descrição deve ter no máximo ${TASK_LIMITS.description} caracteres.`,
      )
      .nullable()
      .optional(),
  ),
  dueDate: z
    .string({ error: 'Informe o prazo.' })
    .refine(isValidIsoDate, 'Informe uma data válida.'),
  priority: z.enum(TASK_PRIORITIES, { error: 'Selecione a prioridade.' }),
  assigneeId: z.uuid('Selecione o responsável.'),
  customerId: z.preprocess(blankToNull, z.uuid().nullable().optional()),
  dealId: z.preprocess(blankToNull, z.uuid().nullable().optional()),
});

export type TaskInput = z.output<typeof taskSchema>;
export type TaskUpdateInput = Partial<TaskInput> & { status?: TaskStatus };
