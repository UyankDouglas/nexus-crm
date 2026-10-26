import { describe, expect, it } from 'vitest';
import { activitySchema, isActivityDateAllowed } from './activities.js';
import { isOpenTaskStatus, taskSchema } from './tasks.js';

const UUID = '01a16a74-0000-7000-8000-000000000001';

describe('taskSchema', () => {
  it('normaliza campos opcionais vazios e exige prazo e responsável', () => {
    const result = taskSchema.safeParse({
      title: '  Ligar para o cliente ',
      description: '',
      dueDate: '2026-10-30',
      priority: 'HIGH',
      assigneeId: UUID,
      customerId: '',
      dealId: '',
    });
    expect(result.success && result.data).toEqual({
      title: 'Ligar para o cliente',
      description: null,
      dueDate: '2026-10-30',
      priority: 'HIGH',
      assigneeId: UUID,
      customerId: null,
      dealId: null,
    });

    const invalid = taskSchema.safeParse({ title: 'Ok', dueDate: '2026-02-30', priority: 'X' });
    expect(invalid.success).toBe(false);
    const fields = invalid.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['dueDate', 'priority', 'assigneeId']));
  });

  it('considera pendentes apenas tarefas a fazer ou em andamento', () => {
    expect(isOpenTaskStatus('TODO')).toBe(true);
    expect(isOpenTaskStatus('IN_PROGRESS')).toBe(true);
    expect(isOpenTaskStatus('DONE')).toBe(false);
    expect(isOpenTaskStatus('CANCELED')).toBe(false);
  });
});

describe('activitySchema', () => {
  const base = { type: 'CALL', subject: 'Alinhamento da proposta', customerId: UUID };

  it('converte a data local do formulário para ISO e exige um vínculo', () => {
    const result = activitySchema.safeParse({ ...base, occurredAt: '2026-01-15T14:30' });
    expect(result.success).toBe(true);
    expect(result.data?.occurredAt).toBe(new Date('2026-01-15T14:30').toISOString());

    const unlinked = activitySchema.safeParse({
      ...base,
      customerId: '',
      occurredAt: '2026-01-15T14:30',
    });
    expect(unlinked.error?.issues[0]?.message).toBe('Vincule a atividade a um cliente ou negócio.');
  });

  it('recusa datas no futuro, com tolerância para relógios adiantados', () => {
    const now = new Date('2026-10-26T12:00:00Z');
    expect(isActivityDateAllowed(new Date('2026-10-26T12:04:00Z'), now)).toBe(true);
    expect(isActivityDateAllowed(new Date('2026-10-26T12:06:00Z'), now)).toBe(false);

    const future = activitySchema.safeParse({ ...base, occurredAt: '2999-01-01T10:00' });
    expect(future.success).toBe(false);
  });
});
