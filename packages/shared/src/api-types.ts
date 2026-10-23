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

export interface HealthResponse {
  status: 'ok' | 'error';
  database: 'up' | 'down';
  timestamp: string;
}
