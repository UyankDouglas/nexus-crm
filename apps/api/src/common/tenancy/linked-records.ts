import type { TenantAuthContext } from '../auth/auth-context';
import { AppException } from '../errors/app.exception';
import type { PrismaService } from '../../prisma/prisma.service';
import { customerScope } from '../../modules/customers/customer-scope';
import { dealScope } from '../../modules/deals/deal-scope';

export interface LinkInput {
  customerId?: string | null;
  dealId?: string | null;
}

export interface ResolvedLinks {
  customerId: string | null;
  dealId: string | null;
}

/**
 * Valida os vínculos de tarefas e atividades: cliente e negócio precisam estar no escopo do
 * usuário (organização ativa e, para vendedores, a própria carteira). Com um negócio, o cliente
 * é o do negócio; se ambos forem informados, precisam corresponder.
 */
export async function resolveLinks(
  prisma: PrismaService,
  auth: TenantAuthContext,
  input: LinkInput,
): Promise<ResolvedLinks> {
  if (input.dealId) {
    const deal = await prisma.deal.findFirst({
      where: { AND: [dealScope(auth), { id: input.dealId }] },
      select: { customerId: true },
    });
    if (!deal) throw AppException.validation({ dealId: ['Negócio não encontrado.'] });
    if (input.customerId && input.customerId !== deal.customerId) {
      throw AppException.validation({
        dealId: ['O negócio selecionado pertence a outro cliente.'],
      });
    }
    return { customerId: deal.customerId, dealId: input.dealId };
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { AND: [customerScope(auth), { id: input.customerId }] },
      select: { id: true },
    });
    if (!customer) throw AppException.validation({ customerId: ['Cliente não encontrado.'] });
    return { customerId: customer.id, dealId: null };
  }

  return { customerId: null, dealId: null };
}
