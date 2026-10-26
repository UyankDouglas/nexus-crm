import { Injectable } from '@nestjs/common';
import { PIPELINE_LIMITS, type PipelineItem } from '@nexus/shared';
import type { TenantAuthContext } from '../../common/auth/auth-context';
import { AppException } from '../../common/errors/app.exception';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { actorOf, AuditService } from '../audit/audit.service';
import { toPipelineItem } from './deal.mapper';
import { createDefaultPipeline } from './default-pipeline';
import type {
  CreatePipelineDto,
  CreateStageDto,
  ReorderStagesDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from './dto/pipeline-settings.dto';

type Tx = Prisma.TransactionClient;

const withStages = { stages: true } satisfies Prisma.PipelineInclude;

/**
 * Configuração de funis e etapas (somente administradores). Cada funil tem etapas em andamento
 * configuráveis e exatamente uma etapa de ganho e uma de perda, sempre ao final. Os nomes de
 * etapa gravados no histórico dos negócios não mudam quando a etapa é renomeada ou removida.
 */
@Injectable()
export class PipelineSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(auth: TenantAuthContext, dto: CreatePipelineDto): Promise<PipelineItem> {
    const organizationId = auth.organization.id;
    const count = await this.prisma.pipeline.count({ where: { organizationId } });
    if (count >= PIPELINE_LIMITS.maxPipelines) {
      throw AppException.conflict(`Use no máximo ${PIPELINE_LIMITS.maxPipelines} funis.`);
    }

    const id = await this.prisma.$transaction(async (tx) => {
      const pipeline = await createDefaultPipeline(tx, organizationId, {
        name: dto.name,
        isDefault: false,
      });
      await this.audit.record(tx, actorOf(auth), {
        action: 'pipeline.created',
        entityType: 'pipeline',
        entityId: pipeline.id,
        summary: `Funil ${dto.name} criado com as etapas padrão.`,
      });
      return pipeline.id;
    });
    return this.get(auth, id);
  }

  async update(auth: TenantAuthContext, id: string, dto: UpdatePipelineDto): Promise<PipelineItem> {
    const pipeline = await this.findPipeline(auth, id);
    if (dto.isDefault === false) {
      throw AppException.validation({
        isDefault: ['Escolha outro funil como padrão em vez de desmarcar este.'],
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const changes: string[] = [];
      if (dto.name && dto.name !== pipeline.name) {
        changes.push(`renomeado de "${pipeline.name}" para "${dto.name}"`);
      }
      if (dto.isDefault && !pipeline.isDefault) {
        await tx.pipeline.updateMany({
          where: { organizationId: auth.organization.id, isDefault: true },
          data: { isDefault: false },
        });
        changes.push('definido como padrão');
      }
      if (!changes.length) return;

      await tx.pipeline.update({
        where: { id },
        data: { name: dto.name, isDefault: dto.isDefault || undefined },
      });
      await this.audit.record(tx, actorOf(auth), {
        action: 'pipeline.updated',
        entityType: 'pipeline',
        entityId: id,
        summary: `Funil ${dto.name ?? pipeline.name} ${changes.join(' e ')}.`,
        metadata: { name: { from: pipeline.name, to: dto.name ?? pipeline.name } },
      });
    });
    return this.get(auth, id);
  }

  async remove(auth: TenantAuthContext, id: string): Promise<void> {
    const pipeline = await this.findPipeline(auth, id);
    if (pipeline.isDefault) {
      throw AppException.conflict('Defina outro funil como padrão antes de excluir este.');
    }
    const deals = await this.prisma.deal.count({ where: { pipelineId: id } });
    if (deals > 0) {
      throw AppException.conflict(
        `Este funil tem ${deals} ${deals === 1 ? 'negócio' : 'negócios'}. Exclua ou mova os negócios antes de excluir o funil.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pipeline.delete({ where: { id } });
      await this.audit.record(tx, actorOf(auth), {
        action: 'pipeline.deleted',
        entityType: 'pipeline',
        entityId: id,
        summary: `Funil ${pipeline.name} excluído.`,
      });
    });
  }

  /** Nova etapa em andamento, logo antes das etapas de ganho e perda. */
  async addStage(
    auth: TenantAuthContext,
    pipelineId: string,
    dto: CreateStageDto,
  ): Promise<PipelineItem> {
    const pipeline = await this.findPipeline(auth, pipelineId);
    const open = pipeline.stages.filter((stage) => stage.kind === 'OPEN');
    if (open.length >= PIPELINE_LIMITS.maxOpenStages) {
      throw AppException.conflict(
        `Use no máximo ${PIPELINE_LIMITS.maxOpenStages} etapas em andamento por funil.`,
      );
    }
    this.assertUniqueName(pipeline.stages, dto.name);

    await this.prisma.$transaction(async (tx) => {
      const stage = await tx.pipelineStage.create({
        data: {
          organizationId: auth.organization.id,
          pipelineId,
          name: dto.name,
          kind: 'OPEN',
          probability: dto.probability,
          position: open.length,
        },
      });
      await this.renumber(tx, pipelineId);
      await this.audit.record(tx, actorOf(auth), {
        action: 'stage.created',
        entityType: 'stage',
        entityId: stage.id,
        summary: `Etapa ${dto.name} criada no funil ${pipeline.name} (${dto.probability}%).`,
        metadata: { pipeline: pipeline.name, probability: dto.probability },
      });
    });
    return this.get(auth, pipelineId);
  }

  async updateStage(
    auth: TenantAuthContext,
    pipelineId: string,
    stageId: string,
    dto: UpdateStageDto,
  ): Promise<PipelineItem> {
    const pipeline = await this.findPipeline(auth, pipelineId);
    const stage = this.findStage(pipeline.stages, stageId);
    if (
      stage.kind !== 'OPEN' &&
      dto.probability !== undefined &&
      dto.probability !== stage.probability
    ) {
      throw AppException.validation({
        probability: ['A probabilidade das etapas de ganho e perda é fixa.'],
      });
    }
    if (dto.name && dto.name.toLowerCase() !== stage.name.toLowerCase()) {
      this.assertUniqueName(pipeline.stages, dto.name);
    }

    const name = dto.name ?? stage.name;
    const probability = dto.probability ?? stage.probability;
    if (name === stage.name && probability === stage.probability) return this.get(auth, pipelineId);

    await this.prisma.$transaction(async (tx) => {
      await tx.pipelineStage.update({ where: { id: stageId }, data: { name, probability } });
      await this.audit.record(tx, actorOf(auth), {
        action: 'stage.updated',
        entityType: 'stage',
        entityId: stageId,
        summary:
          name !== stage.name
            ? `Etapa ${stage.name} renomeada para ${name} (funil ${pipeline.name}).`
            : `Probabilidade da etapa ${name} alterada de ${stage.probability}% para ${probability}%.`,
        metadata: {
          name: { from: stage.name, to: name },
          probability: { from: stage.probability, to: probability },
        },
      });
    });
    return this.get(auth, pipelineId);
  }

  /** Reordena as etapas em andamento; ganho e perda continuam ao final. */
  async reorderStages(
    auth: TenantAuthContext,
    pipelineId: string,
    dto: ReorderStagesDto,
  ): Promise<PipelineItem> {
    const pipeline = await this.findPipeline(auth, pipelineId);
    const open = pipeline.stages.filter((stage) => stage.kind === 'OPEN');
    const ids = new Set(dto.stageIds);
    if (
      ids.size !== dto.stageIds.length ||
      ids.size !== open.length ||
      !open.every((s) => ids.has(s.id))
    ) {
      throw AppException.validation({
        stageIds: ['Informe todas as etapas em andamento do funil, sem repetições.'],
      });
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [position, id] of dto.stageIds.entries()) {
        await tx.pipelineStage.update({ where: { id }, data: { position } });
      }
      await this.renumber(tx, pipelineId);
      const names = dto.stageIds.map((id) => open.find((stage) => stage.id === id)!.name);
      await this.audit.record(tx, actorOf(auth), {
        action: 'stages.reordered',
        entityType: 'pipeline',
        entityId: pipelineId,
        summary: `Etapas do funil ${pipeline.name} reordenadas: ${names.join(' → ')}.`,
        metadata: { order: names },
      });
    });
    return this.get(auth, pipelineId);
  }

  /**
   * Remove uma etapa em andamento. Se houver negócios nela, `moveTo` indica a etapa que os
   * recebe; cada movimentação fica registrada no histórico do negócio.
   */
  async removeStage(
    auth: TenantAuthContext,
    pipelineId: string,
    stageId: string,
    moveTo?: string,
  ): Promise<PipelineItem> {
    const pipeline = await this.findPipeline(auth, pipelineId);
    const stage = this.findStage(pipeline.stages, stageId);
    if (stage.kind !== 'OPEN') {
      throw AppException.conflict('As etapas de ganho e perda não podem ser excluídas.');
    }
    const open = pipeline.stages.filter((item) => item.kind === 'OPEN');
    if (open.length <= 1) {
      throw AppException.conflict('O funil precisa de pelo menos uma etapa em andamento.');
    }

    const deals = await this.prisma.deal.findMany({
      where: { pipelineId, stageId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    const target = moveTo ? open.find((item) => item.id === moveTo && item.id !== stageId) : null;
    if (deals.length > 0 && !moveTo) {
      throw AppException.conflict(
        `Esta etapa tem ${deals.length} ${deals.length === 1 ? 'negócio' : 'negócios'}. Escolha para qual etapa movê-los.`,
      );
    }
    if (moveTo && !target) {
      throw AppException.validation({ moveTo: ['Escolha outra etapa em andamento deste funil.'] });
    }

    await this.prisma.$transaction(async (tx) => {
      if (target && deals.length > 0) {
        const last = await tx.deal.findFirst({
          where: { pipelineId, stageId: target.id },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const start = (last?.position ?? -1) + 1;
        const now = new Date();
        for (const [index, deal] of deals.entries()) {
          await tx.deal.update({
            where: { id: deal.id },
            data: { stageId: target.id, position: start + index, stageChangedAt: now },
          });
        }
        await tx.dealStageHistory.createMany({
          data: deals.map((deal) => ({
            organizationId: auth.organization.id,
            dealId: deal.id,
            fromStageId: stage.id,
            fromStageName: stage.name,
            fromStatus: 'OPEN' as const,
            toStageId: target.id,
            toStageName: target.name,
            toStatus: 'OPEN' as const,
            changedById: auth.user.id,
            createdAt: now,
          })),
        });
      }

      await tx.pipelineStage.delete({ where: { id: stageId } });
      await this.renumber(tx, pipelineId);
      await this.audit.record(tx, actorOf(auth), {
        action: 'stage.deleted',
        entityType: 'stage',
        entityId: stageId,
        summary:
          deals.length > 0
            ? `Etapa ${stage.name} excluída do funil ${pipeline.name}; ${deals.length} ${deals.length === 1 ? 'negócio movido' : 'negócios movidos'} para ${target!.name}.`
            : `Etapa ${stage.name} excluída do funil ${pipeline.name}.`,
        metadata: { movedDeals: deals.length, moveTo: target?.name ?? null },
      });
    });
    return this.get(auth, pipelineId);
  }

  private async get(auth: TenantAuthContext, id: string): Promise<PipelineItem> {
    return toPipelineItem(await this.findPipeline(auth, id));
  }

  private async findPipeline(auth: TenantAuthContext, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, organizationId: auth.organization.id },
      include: withStages,
    });
    if (!pipeline) throw AppException.notFound('Funil não encontrado.');
    return pipeline;
  }

  private findStage<T extends { id: string }>(stages: T[], stageId: string): T {
    const stage = stages.find((item) => item.id === stageId);
    if (!stage) throw AppException.notFound('Etapa não encontrada.');
    return stage;
  }

  private assertUniqueName(stages: Array<{ name: string }>, name: string): void {
    if (stages.some((stage) => stage.name.toLowerCase() === name.toLowerCase())) {
      throw AppException.validation({ name: ['Já existe uma etapa com este nome no funil.'] });
    }
  }

  /**
   * Posições contínuas: etapas em andamento na ordem atual e, por último, ganho e perda.
   */
  private async renumber(tx: Tx, pipelineId: string): Promise<void> {
    const stages = await tx.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, kind: true, position: true },
    });
    const kindOrder = { OPEN: 0, WON: 1, LOST: 2 } as const;
    const ordered = [...stages].sort((a, b) => kindOrder[a.kind] - kindOrder[b.kind]);
    for (const [position, stage] of ordered.entries()) {
      if (stage.position !== position) {
        await tx.pipelineStage.update({ where: { id: stage.id }, data: { position } });
      }
    }
  }
}
