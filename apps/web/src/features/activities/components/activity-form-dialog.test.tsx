import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ActivityFormDialog } from './activity-form-dialog';

const CUSTOMER = { id: '01a16a74-0000-7000-8000-0000000000c1', name: 'Aurora Distribuidora' };
const mutateAsync = vi.fn();

vi.mock('../hooks', () => ({
  useCreateActivity: () => ({ mutateAsync }),
  useUpdateActivity: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock('@/features/deals/hooks', () => ({
  useDeals: () => ({ data: { data: [], meta: { total: 0 } } }),
}));
vi.mock('@/features/customers/hooks', () => ({
  useCustomers: () => ({ data: { data: [], meta: { total: 0 } }, isPending: false }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('ActivityFormDialog', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({ type: 'MEETING' });
  });

  it('registra no cliente de contexto, com a data local convertida para ISO', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ActivityFormDialog mode={{ kind: 'create', customer: CUSTOMER }} onClose={onClose} />);

    expect(screen.getByText(CUSTOMER.name)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Reunião' }));
    await user.type(screen.getByLabelText('Assunto'), 'Apresentação do roteiro');
    const when = screen.getByLabelText('Quando aconteceu');
    await user.clear(when);
    await user.type(when, '2026-10-20T14:30');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(mutateAsync).toHaveBeenCalledWith({
      type: 'MEETING',
      subject: 'Apresentação do roteiro',
      description: null,
      occurredAt: new Date('2026-10-20T14:30').toISOString(),
      customerId: CUSTOMER.id,
      dealId: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('sem contexto, exige escolher um cliente ou negócio', async () => {
    const user = userEvent.setup();
    render(<ActivityFormDialog mode={{ kind: 'create' }} onClose={vi.fn()} />);

    await user.type(screen.getByLabelText('Assunto'), 'Nota rápida');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    expect(
      await screen.findByText('Vincule a atividade a um cliente ou negócio.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
