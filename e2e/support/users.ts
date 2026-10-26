import { join } from 'node:path';
import { E2E } from './env.js';

/** Contas da seed de demonstração usadas nos testes. */
export const USERS = {
  admin: { name: 'Ana Ribeiro', email: 'ana.ribeiro@horizonte.example' },
  manager: { name: 'Carlos Mendes', email: 'carlos.mendes@horizonte.example' },
  seller: { name: 'Juliana Costa', email: 'juliana.costa@horizonte.example' },
  otherSeller: { name: 'Rafael Lima', email: 'rafael.lima@horizonte.example' },
  otherOrgAdmin: { name: 'Beatriz Alves', email: 'beatriz.alves@vertice.example' },
} as const;

export type Role = 'admin' | 'manager' | 'seller' | 'otherOrgAdmin';

export const HORIZONTE = 'Horizonte Tecnologia (Demo)';
export const VERTICE = 'Vértice Consultoria (Demo)';

/** Sessão salva pelo projeto de preparação para cada perfil. */
export function storageFor(role: Role): string {
  return join(E2E.authDir, `${role}.json`);
}

/** Sufixo curto para nomes únicos entre execuções. */
export function unique(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}
