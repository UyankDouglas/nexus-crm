import type { ActivityType } from './activities.js';
import type { AuditAction } from './admin.js';
import type { BrazilianState, CustomerStatus, CustomerType } from './customers.js';
import type { Granularity } from './dashboard.js';
import type { DealStatus, StageKind } from './deals.js';
import type { Permission } from './permissions.js';
import type { MemberRole, MembershipStatus } from './roles.js';
import type { TaskPriority, TaskStatus } from './tasks.js';

export const API_ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_INVALID: 'CSRF_INVALID',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  ORGANIZATION_REQUIRED: 'ORGANIZATION_REQUIRED',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  INVALID_INVITATION: 'INVALID_INVITATION',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/** Formato padronizado de erro retornado pela API. */
export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface MembershipSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: MemberRole;
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
  permissions: Permission[];
}

export interface MeResponse {
  user: AuthUser;
  memberships: MembershipSummary[];
  activeOrganization: ActiveOrganization | null;
  session: {
    createdAt: string;
    expiresAt: string;
  };
}

export interface CsrfResponse {
  csrfToken: string;
}

export interface MessageResponse {
  message: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  memberCount: number;
  membersByRole: Record<MemberRole, number>;
}

export interface OrganizationMemberItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MembershipStatus;
  joinedAt: string;
  lastLoginAt: string | null;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface UserSummary {
  id: string;
  name: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
}

export interface CustomerListItem {
  id: string;
  type: CustomerType;
  name: string;
  tradeName: string | null;
  /** CPF ou CNPJ sem pontuação. */
  document: string | null;
  email: string | null;
  /** Somente dígitos. */
  phone: string | null;
  city: string | null;
  state: BrazilianState | null;
  status: CustomerStatus;
  tags: string[];
  owner: UserSummary | null;
  company: CustomerSummary | null;
  contactsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContactItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerListItem {
  website: string | null;
  notes: string | null;
  createdBy: UserSummary | null;
  contacts: ContactItem[];
  /** Pessoas físicas vinculadas a esta empresa (visíveis ao usuário). */
  linkedPeople: CustomerSummary[];
}

export interface CustomerStats {
  total: number;
  byStatus: Record<CustomerStatus, number>;
  unassigned: number;
}

export interface PipelineStageItem {
  id: string;
  name: string;
  kind: StageKind;
  probability: number;
  position: number;
}

export interface PipelineItem {
  id: string;
  name: string;
  isDefault: boolean;
  stages: PipelineStageItem[];
}

/** Card do Kanban e linha da listagem de negócios. */
export interface DealCard {
  id: string;
  title: string;
  /** Valor potencial em reais. */
  value: number;
  status: DealStatus;
  /** AAAA-MM-DD */
  expectedCloseDate: string | null;
  stageId: string;
  pipelineId: string;
  customer: CustomerSummary;
  owner: UserSummary | null;
  stageChangedAt: string;
  closedAt: string | null;
  updatedAt: string;
}

export interface DealListItem extends DealCard {
  stageName: string;
}

export interface BoardColumn {
  stage: PipelineStageItem;
  deals: DealCard[];
  /** Totais dos negócios exibidos na coluna (respeitando filtros e escopo). */
  count: number;
  totalValue: number;
}

export interface DealBoard {
  pipeline: PipelineItem;
  columns: BoardColumn[];
  /** Negócios encerrados há mais tempo que isso não aparecem no quadro. */
  closedWindowDays: number;
}

export interface DealHistoryItem {
  id: string;
  fromStageName: string | null;
  toStageName: string;
  fromStatus: DealStatus | null;
  toStatus: DealStatus;
  lostReason: string | null;
  changedBy: UserSummary | null;
  createdAt: string;
}

export interface DealDetail extends DealListItem {
  notes: string | null;
  lostReason: string | null;
  createdBy: UserSummary | null;
  createdAt: string;
  history: DealHistoryItem[];
}

export interface DealStats {
  open: { count: number; value: number };
  won: { count: number; value: number };
  lost: { count: number };
  /** Ganhos ÷ (ganhos + perdidos), de 0 a 1; `null` sem negócios encerrados. */
  conversionRate: number | null;
}

/** Referência curta a um negócio (vínculo de tarefas e atividades). */
export interface DealSummary {
  id: string;
  title: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  /** AAAA-MM-DD */
  dueDate: string;
  completedAt: string | null;
  assignee: UserSummary;
  customer: CustomerSummary | null;
  deal: DealSummary | null;
  createdBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  /** A fazer + em andamento. */
  open: number;
  overdue: number;
  dueToday: number;
  completedLast7Days: number;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  subject: string;
  description: string | null;
  occurredAt: string;
  customer: CustomerSummary;
  deal: DealSummary | null;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export interface SalesBucket {
  /** Primeiro dia do grupo (AAAA-MM-DD). */
  start: string;
  wonCount: number;
  wonValue: number;
}

export interface StageSummary {
  stageId: string;
  name: string;
  count: number;
  value: number;
}

export interface SellerPerformance {
  /** `null`: negócios ainda sem responsável. */
  user: UserSummary | null;
  wonCount: number;
  wonValue: number;
  lostCount: number;
  openCount: number;
  openValue: number;
  /** Ganhos ÷ encerrados no período; `null` sem encerramentos. */
  conversionRate: number | null;
}

/**
 * Painel inicial. Totais de carteira e pipeline são a fotografia atual; resultados, séries e
 * distribuição consideram o período informado. Tudo respeita o escopo do usuário.
 */
export interface DashboardSummary {
  period: { from: string; to: string; granularity: Granularity };
  customers: { total: number };
  pipeline: { openCount: number; openValue: number };
  results: {
    wonCount: number;
    wonValue: number;
    lostCount: number;
    conversionRate: number | null;
  };
  tasks: { open: number; overdue: number };
  sales: SalesBucket[];
  /** Negócios em andamento por etapa do funil padrão. */
  stages: StageSummary[];
  sellers: SellerPerformance[];
  /** Negócios criados no período, pelo status atual. */
  distribution: { open: number; won: number; lost: number };
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------

export interface InvitationItem {
  id: string;
  email: string;
  role: MemberRole;
  invitedBy: UserSummary | null;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

/** Dados exibidos na página pública de aceite (o token vale como prova de posse do e-mail). */
export interface InvitationPreview {
  organizationName: string;
  email: string;
  role: MemberRole;
  invitedBy: string | null;
  expiresAt: string;
  /** Já existe conta com o e-mail: o aceite apenas adiciona a organização. */
  accountExists: boolean;
}

export interface AcceptInvitationResponse {
  organizationId: string;
  organizationName: string;
  accountCreated: boolean;
  /** Nova conta: a sessão já foi iniciada (cookie). */
  signedIn: boolean;
}

export interface AuditLogItem {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  actor: UserSummary | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

export interface SellerReportRow extends SellerPerformance {
  /** Receita ganha ÷ negócios ganhos no período. */
  averageTicket: number | null;
  /** Atividades registradas pelo membro no período. */
  activities: number;
  /** Tarefas sob sua responsabilidade concluídas no período. */
  tasksCompleted: number;
}

export interface PipelineStageReport extends StageSummary {
  pipelineId: string;
  pipelineName: string;
  probability: number;
  /** Valor × probabilidade da etapa (previsão ponderada). */
  weightedValue: number;
}

export interface LossReasonSummary {
  reason: string;
  count: number;
  value: number;
}

export interface ReportsOverview {
  period: { from: string; to: string; granularity: Granularity };
  totals: {
    wonCount: number;
    wonValue: number;
    lostCount: number;
    lostValue: number;
    conversionRate: number | null;
    averageTicket: number | null;
    openCount: number;
    openValue: number;
    weightedValue: number;
  };
  sellers: SellerReportRow[];
  revenue: SalesBucket[];
  pipeline: PipelineStageReport[];
  lossReasons: LossReasonSummary[];
}

export interface ClosedDealItem {
  id: string;
  title: string;
  status: 'WON' | 'LOST';
  value: number;
  closedAt: string;
  stageName: string;
  lostReason: string | null;
  customer: CustomerSummary;
  owner: UserSummary | null;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}
