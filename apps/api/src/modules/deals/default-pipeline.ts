import { DEFAULT_PIPELINE_NAME, DEFAULT_PIPELINE_STAGES } from '@nexus/shared';
import type { Prisma } from '../../generated/prisma/client';

/**
 * Cria um funil com as etapas padrão. Sem opções, é o funil padrão da organização (cadastro e
 * seed); a administração usa o mesmo modelo para criar funis adicionais.
 */
export async function createDefaultPipeline(
  tx: Prisma.TransactionClient,
  organizationId: string,
  options: { name?: string; isDefault?: boolean } = {},
): Promise<{ id: string }> {
  const pipeline = await tx.pipeline.create({
    data: {
      organizationId,
      name: options.name ?? DEFAULT_PIPELINE_NAME,
      isDefault: options.isDefault ?? true,
    },
    select: { id: true },
  });

  await tx.pipelineStage.createMany({
    data: DEFAULT_PIPELINE_STAGES.map((stage, position) => ({
      organizationId,
      pipelineId: pipeline.id,
      name: stage.name,
      kind: stage.kind,
      probability: stage.probability,
      position,
    })),
  });

  return pipeline;
}
