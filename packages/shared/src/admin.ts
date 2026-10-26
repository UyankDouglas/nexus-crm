import { z } from 'zod';
import { emailSchema, passwordSchema, personNameSchema } from './auth.js';
import { MEMBER_ROLES, type MembershipStatus } from './roles.js';

export const MEMBERSHIP_STATUS_LABELS: Record<MembershipStatus, string> = {
  ACTIVE: 'Ativo',
  SUSPENDED: 'Suspenso',
};

// ---------------------------------------------------------------------------
// Convites
// ---------------------------------------------------------------------------

/** Validade do link de convite. */
export const INVITATION_TTL_DAYS = 7;

export const invitationSchema = z.object({
  email: emailSchema,
  role: z.enum(MEMBER_ROLES, { error: 'Selecione o perfil.' }),
});
export type InvitationInput = z.infer<typeof invitationSchema>;

/** Aceite por quem ainda não tem conta: nome e senha da nova conta. */
export const acceptInvitationSchema = z
  .object({
    name: personNameSchema,
    password: passwordSchema,
    confirmPassword: z.string({ error: 'Confirme a senha.' }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  });
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

// ---------------------------------------------------------------------------
// Funis e etapas
// ---------------------------------------------------------------------------

export const PIPELINE_LIMITS = {
  name: 80,
  stageName: 60,
  /** Etapas em andamento por funil (as de ganho e perda são fixas). */
  maxOpenStages: 12,
  maxPipelines: 10,
} as const;

export const pipelineSchema = z.object({
  name: z
    .string({ error: 'Informe o nome do funil.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(PIPELINE_LIMITS.name, `O nome deve ter no máximo ${PIPELINE_LIMITS.name} caracteres.`),
});
export type PipelineInput = z.infer<typeof pipelineSchema>;

export const stageSchema = z.object({
  name: z
    .string({ error: 'Informe o nome da etapa.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(
      PIPELINE_LIMITS.stageName,
      `O nome deve ter no máximo ${PIPELINE_LIMITS.stageName} caracteres.`,
    ),
  probability: z.coerce
    .number({ error: 'Informe a probabilidade.' })
    .int('Use um número inteiro.')
    .min(0, 'Use um valor entre 0 e 100.')
    .max(100, 'Use um valor entre 0 e 100.'),
});
export type StageInput = z.infer<typeof stageSchema>;

// ---------------------------------------------------------------------------
// Auditoria
// ---------------------------------------------------------------------------

export const AUDIT_ACTIONS = [
  'organization.updated',
  'member.role_changed',
  'member.suspended',
  'member.reactivated',
  'invitation.created',
  'invitation.resent',
  'invitation.revoked',
  'invitation.accepted',
  'pipeline.created',
  'pipeline.updated',
  'pipeline.deleted',
  'stage.created',
  'stage.updated',
  'stage.deleted',
  'stages.reordered',
  'customer.deleted',
  'deal.deleted',
  'deal.reopened',
  'report.exported',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  'organization.updated': 'Organização atualizada',
  'member.role_changed': 'Perfil de membro alterado',
  'member.suspended': 'Acesso suspenso',
  'member.reactivated': 'Acesso reativado',
  'invitation.created': 'Convite enviado',
  'invitation.resent': 'Convite reenviado',
  'invitation.revoked': 'Convite cancelado',
  'invitation.accepted': 'Convite aceito',
  'pipeline.created': 'Funil criado',
  'pipeline.updated': 'Funil atualizado',
  'pipeline.deleted': 'Funil excluído',
  'stage.created': 'Etapa criada',
  'stage.updated': 'Etapa atualizada',
  'stage.deleted': 'Etapa excluída',
  'stages.reordered': 'Etapas reordenadas',
  'customer.deleted': 'Cliente excluído',
  'deal.deleted': 'Negócio excluído',
  'deal.reopened': 'Negócio reaberto',
  'report.exported': 'Relatório exportado',
};

/** Agrupamento para o filtro da tela de auditoria. */
export const AUDIT_CATEGORIES = {
  members: ['member.role_changed', 'member.suspended', 'member.reactivated'],
  invitations: [
    'invitation.created',
    'invitation.resent',
    'invitation.revoked',
    'invitation.accepted',
  ],
  pipelines: [
    'pipeline.created',
    'pipeline.updated',
    'pipeline.deleted',
    'stage.created',
    'stage.updated',
    'stage.deleted',
    'stages.reordered',
  ],
  records: ['customer.deleted', 'deal.deleted', 'deal.reopened'],
  exports: ['report.exported'],
  organization: ['organization.updated'],
} as const satisfies Record<string, readonly AuditAction[]>;
export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

export const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  members: 'Membros',
  invitations: 'Convites',
  pipelines: 'Funis e etapas',
  records: 'Clientes e negócios',
  exports: 'Exportações',
  organization: 'Organização',
};
