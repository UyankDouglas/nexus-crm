import type { BrazilianState, CustomerStatus, CustomerType } from './customers.js';
import type { Permission } from './permissions.js';
import type { MemberRole, MembershipStatus } from './roles.js';

export const API_ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_INVALID: 'CSRF_INVALID',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_IN_USE: 'EMAIL_IN_USE',
  ORGANIZATION_REQUIRED: 'ORGANIZATION_REQUIRED',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
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

export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}
