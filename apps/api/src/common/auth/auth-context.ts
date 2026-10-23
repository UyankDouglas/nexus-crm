import type { MemberRole } from '@nexus/shared';

/** Contexto de autenticação resolvido pelo AuthGuard a partir do cookie de sessão. */
export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
  };
  session: {
    id: string;
    createdAt: Date;
    expiresAt: Date;
  };
  /** Organização ativa da sessão — presente somente se o vínculo estiver ATIVO. */
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  membership: {
    id: string;
    role: MemberRole;
  } | null;
}

/** Contexto garantido nas rotas que exigem organização ativa (padrão de todas as rotas). */
export interface TenantAuthContext extends AuthContext {
  organization: NonNullable<AuthContext['organization']>;
  membership: NonNullable<AuthContext['membership']>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      requestId?: string;
    }
  }
}
