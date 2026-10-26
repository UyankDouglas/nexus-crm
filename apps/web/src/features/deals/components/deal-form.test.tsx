import type { PipelineStageItem } from '@nexus/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePermission } from '@/features/auth/hooks';
import { ApiError } from '@/services/api-client';
import { DealForm } from './deal-form';

const ME = { id: '01a16a74-0000-7000-8000-000000000001', name: 'Juliana Costa' };
const CUSTOMER = { id: '01a16a74-0000-7000-8000-0000000000c1', name: 'Cobalto Engenharia' };

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

const STAGES: PipelineStageItem[] = [
  { id: '01a16a74-0000-7000-8000-0000000000a1', name: 'Novo lead', kind: 'OPEN', probability: 10, position: 0 },
  { id: '01a16a74-0000-7000-8000-0000000000a2', name: 'Qualificação', kind: 'OPEN', probability: 40, position: 1 },
]; // prettier-ignore

const GROUPS = [{ id: '01a16a74-0000-7000-8000-0000000000f1', name: 'Vendas', stages: STAGES }];

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <DealForm
      deal={null}
      stageGroups={GROUPS}
      initialCustomer={CUSTOMER}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      submitLabel="Cadastrar"
    />,
  );
  return onSubmit;
}

describe('DealForm', () => {
  beforeEach(() => {
    vi.mocked(usePermission).mockReturnValue(false);
  });

  it('valida nome e valor antes de enviar', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(await screen.findByText('O nome deve ter pelo menos 2 caracteres.')).toBeInTheDocument();
    expect(screen.getByText('Informe um valor válido.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('formata o valor em reais e envia número, etapa e o próprio usuário como responsável', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm();

    await user.type(screen.getByLabelText('Nome do negócio'), 'Renovação anual');
    const value = screen.getByLabelText('Valor potencial');
    await user.type(value, '1234,5');
    await user.tab();
    expect(value).toHaveValue('1.234,50');

    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Renovação anual',
      customerId: CUSTOMER.id,
      stageId: STAGES[0]!.id,
      value: 1234.5,
      expectedCloseDate: null,
      ownerId: ME.id,
      notes: null,
    });
    // Vendedores não escolhem o responsável: o campo aparece somente leitura.
    expect(screen.getByLabelText('Responsável')).toHaveValue('Juliana Costa (você)');
  });

  it('exibe nos campos os erros de validação devolvidos pela API', async () => {
    const user = userEvent.setup();
    const onSubmit = renderForm(
      vi.fn().mockRejectedValue(
        new ApiError(400, 'VALIDATION_FAILED', 'Dados inválidos.', {
          customerId: ['Cliente não encontrado.'],
        }),
      ),
    );

    await user.type(screen.getByLabelText('Nome do negócio'), 'Piloto');
    await user.type(screen.getByLabelText('Valor potencial'), '500');
    await user.click(screen.getByRole('button', { name: 'Cadastrar' }));

    expect(onSubmit).toHaveBeenCalled();
    expect(await screen.findByText('Cliente não encontrado.')).toBeInTheDocument();
  });

  it('com mais de um funil, indica o funil da etapa inicial escolhida', () => {
    const expansion = {
      id: '01a16a74-0000-7000-8000-0000000000f2',
      name: 'Expansão',
      stages: [{ ...STAGES[0]!, id: '01a16a74-0000-7000-8000-0000000000b1', name: 'Diagnóstico' }],
    };
    render(
      <DealForm
        deal={null}
        stageGroups={[...GROUPS, expansion]}
        initialStageId={expansion.stages[0]!.id}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        submitLabel="Cadastrar"
      />,
    );

    expect(screen.getByText('Funil: Expansão')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Etapa inicial' })).toHaveTextContent(
      'Diagnóstico',
    );
  });
});
