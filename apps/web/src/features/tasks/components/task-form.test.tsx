import type { TaskItem } from '@nexus/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePermission } from '@/features/auth/hooks';
import { todayIsoDate } from '@/lib/format';
import { TaskForm } from './task-form';

const ME = { id: '01a16a74-0000-7000-8000-000000000001', name: 'Juliana Costa' };
const CUSTOMER = { id: '01a16a74-0000-7000-8000-0000000000c1', name: 'Cobalto Engenharia' };
const DEAL = { id: '01a16a74-0000-7000-8000-0000000000d1', title: 'Gestão de obras' };

vi.mock('@/features/auth/hooks', () => ({
  useCurrentUser: () => ({ user: ME }),
  usePermission: vi.fn(() => false),
}));
vi.mock('@/features/organization/hooks', () => ({
  useOrganizationMembers: () => ({ data: [] }),
}));
vi.mock('@/features/customers/hooks', () => ({
  useCustomers: () => ({ data: { data: [], meta: { total: 0 } }, isPending: false }),
}));
vi.mock('@/features/deals/hooks', () => ({
  useDeals: () => ({ data: { data: [], meta: { total: 0 } } }),
}));

const EXISTING: TaskItem = {
  id: '01a16a74-0000-7000-8000-0000000000e1',
  title: 'Ligar para o cliente',
  description: null,
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  dueDate: '2026-11-05',
  completedAt: null,
  assignee: { id: '01a16a74-0000-7000-8000-000000000002', name: 'Rafael Lima' },
  customer: CUSTOMER,
  deal: DEAL,
  createdBy: null,
  createdAt: '2026-10-20T10:00:00.000Z',
  updatedAt: '2026-10-20T10:00:00.000Z',
};

describe('TaskForm', () => {
  beforeEach(() => {
    vi.mocked(usePermission).mockReturnValue(false);
  });

  it('exige o título e cria a tarefa para o próprio vendedor, com prazo para hoje', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskForm
        task={null}
        initialCustomer={CUSTOMER}
        initialDeal={DEAL}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        submitLabel="Criar tarefa"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));
    expect(
      await screen.findByText('O título deve ter pelo menos 2 caracteres.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Título'), 'Enviar proposta');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Enviar proposta',
      description: null,
      dueDate: todayIsoDate(),
      priority: 'MEDIUM',
      status: 'TODO',
      assigneeId: ME.id,
      customerId: CUSTOMER.id,
      dealId: DEAL.id,
    });
    // Sem `tasks:assign`, o responsável aparece somente para leitura.
    expect(screen.getByLabelText('Responsável')).toHaveValue('Juliana Costa (você)');
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  it('na edição preserva o responsável, o vínculo e mostra o status', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskForm
        task={EXISTING}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
        submitLabel="Salvar alterações"
      />,
    );

    expect(screen.getByLabelText('Responsável')).toHaveValue('Rafael Lima');
    expect(screen.getByLabelText('Status')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: EXISTING.title,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assigneeId: EXISTING.assignee.id,
        customerId: CUSTOMER.id,
        dealId: DEAL.id,
      }),
    );
  });
});
