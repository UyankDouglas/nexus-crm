import type { Request } from 'express';

export interface RequestMeta {
  ipAddress: string | null;
  userAgent: string | null;
}

export function getRequestMeta(request: Request): RequestMeta {
  return {
    ipAddress: request.ip?.slice(0, 64) ?? null,
    userAgent: request.header('user-agent')?.slice(0, 512) ?? null,
  };
}

/** Mascara um e-mail para logs: "ana.ribeiro@empresa.com" → "a***@empresa.com". */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}
