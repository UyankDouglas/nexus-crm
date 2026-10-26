import { describe, expect, it } from 'vitest';
import { describeDue } from './task-utils';

describe('describeDue', () => {
  const today = '2026-10-26';

  it('destaca tarefas do dia e atrasadas', () => {
    expect(describeDue('2026-10-26', 'TODO', today)).toEqual({ label: 'Hoje', tone: 'today' });
    expect(describeDue('2026-10-25', 'IN_PROGRESS', today)).toEqual({
      label: 'Atrasada desde ontem',
      tone: 'overdue',
    });
    expect(describeDue('2026-10-20', 'TODO', today)).toEqual({
      label: 'Atrasada há 6 dias',
      tone: 'overdue',
    });
  });

  it('indica amanhã e mostra a data para prazos mais distantes', () => {
    expect(describeDue('2026-10-27', 'TODO', today)).toEqual({ label: 'Amanhã', tone: 'soon' });
    expect(describeDue('2026-11-05', 'TODO', today).tone).toBe('normal');
  });

  it('não alerta tarefas concluídas ou canceladas', () => {
    expect(describeDue('2026-10-01', 'DONE', today).tone).toBe('closed');
    expect(describeDue('2026-10-01', 'CANCELED', today).tone).toBe('closed');
  });
});
