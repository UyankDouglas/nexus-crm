import { DEFAULT_PIPELINE_NAME, DEFAULT_PIPELINE_STAGES } from '@nexus/shared';
import type { Prisma } from '../../generated/prisma/client';

/** Cria o funil padrão de uma organização (usado no cadastro e na seed de demonstração). */
export async function createDefaultPipeline(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<{ id: string }> {
  const pipeline = await tx.pipeline.create({
    data: { organizationId, name: DEFAULT_PIPELINE_NAME, isDefault: true },
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
