import { addDays, isOpenTaskStatus, rangeLength, type TaskStatus } from '@nexus/shared';
import { formatIsoDate } from '@/lib/format';

export type DueTone = 'overdue' | 'today' | 'soon' | 'normal' | 'closed';

export interface DueInfo {
  label: string;
  tone: DueTone;
}

/**
 * Rótulo do prazo relativo a hoje ("Hoje", "Amanhã", "Atrasada há 3 dias"). Tarefas concluídas
 * ou canceladas mostram apenas a data, sem alerta.
 */
export function describeDue(dueDate: string, status: TaskStatus, today: string): DueInfo {
  if (!isOpenTaskStatus(status)) return { label: formatIsoDate(dueDate), tone: 'closed' };
  if (dueDate === today) return { label: 'Hoje', tone: 'today' };
  if (dueDate < today) {
    const days = rangeLength({ from: dueDate, to: today }) - 1;
    return {
      label: days === 1 ? 'Atrasada desde ontem' : `Atrasada há ${days} dias`,
      tone: 'overdue',
    };
  }
  if (dueDate === addDays(today, 1)) return { label: 'Amanhã', tone: 'soon' };
  return { label: formatIsoDate(dueDate), tone: 'normal' };
}
