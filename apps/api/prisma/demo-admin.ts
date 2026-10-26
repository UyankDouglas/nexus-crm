/**
 * CONVITES E AUDITORIA DE DEMONSTRAÇÃO — dados fictícios para uso local ou em um ambiente
 * público isolado para demonstração. E-mails no domínio reservado `.example` (RFC 2606).
 */
import type { AuditAction, MemberRole } from '@nexus/shared';
import type { DemoOwner } from './demo-customers';

export interface DemoInvitation {
  email: string;
  role: MemberRole;
  invitedBy: Exclude<DemoOwner, null>;
  /** Dias atrás em que o convite foi enviado (vale por 7 dias). */
  sentDaysAgo: number;
}

export interface DemoAuditEntry {
  actor: Exclude<DemoOwner, null>;
  action: AuditAction;
  entityType: string;
  /** `{periodo}` vira "DD/MM/AAAA a DD/MM/AAAA" (exportações), como no registro real. */
  summary: string;
  daysAgo: number;
  /** Exportações: dias do período exportado, terminando no dia da ação. */
  periodDays?: number;
  metadata?: Record<string, string | number>;
}

export const HORIZONTE_INVITATIONS: DemoInvitation[] = [
  { email: 'marina.souza@horizonte.example', role: 'SALES', invitedBy: 'ana', sentDaysAgo: 2 },
];

/** Ações coerentes com os demais dados da seed (o convite acima e negócios já removidos). */
export const HORIZONTE_AUDIT: DemoAuditEntry[] = [
  {
    actor: 'carlos',
    action: 'deal.deleted',
    entityType: 'deal',
    summary: 'Negócio Licenças duplicadas — Grupo Aurora excluído.',
    daysAgo: 9,
  },
  {
    actor: 'carlos',
    action: 'report.exported',
    entityType: 'report',
    summary: 'Relatório "Desempenho por vendedor" exportado em XLSX ({periodo}, 4 linhas).',
    daysAgo: 5,
    periodDays: 30,
    metadata: { type: 'sellers', format: 'xlsx', rows: 4 },
  },
  {
    actor: 'ana',
    action: 'invitation.created',
    entityType: 'invitation',
    summary: 'Convite enviado para marina.souza@horizonte.example como Vendedor.',
    daysAgo: 2,
    metadata: { email: 'marina.souza@horizonte.example', role: 'SALES' },
  },
];
