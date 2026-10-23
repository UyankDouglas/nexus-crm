import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../errors/app.exception';

type Client = PrismaService | Prisma.TransactionClient;

/** Garante que o usuário tem vínculo ATIVO com a organização (ex.: novo responsável comercial). */
export async function assertActiveMember(
  prisma: Client,
  organizationId: string,
  userId: string,
  field = 'ownerId',
): Promise<void> {
  const member = await prisma.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { status: true },
  });
  if (member?.status !== 'ACTIVE') {
    throw AppException.validation({ [field]: ['Selecione um membro ativo da organização.'] });
  }
}
