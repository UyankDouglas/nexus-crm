import { describe, expect, it } from 'vitest';
import {
  acceptInvitationSchema,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  invitationSchema,
  stageSchema,
} from './admin.js';

describe('administração', () => {
  it('normaliza o e-mail do convite e exige um perfil válido', () => {
    expect(invitationSchema.parse({ email: '  Nova@Empresa.Example ', role: 'SALES' })).toEqual({
      email: 'nova@empresa.example',
      role: 'SALES',
    });
    expect(invitationSchema.safeParse({ email: 'x@y.example', role: 'OWNER' }).success).toBe(false);
  });

  it('exige senha forte e confirmação idêntica no aceite', () => {
    const mismatch = acceptInvitationSchema.safeParse({
      name: 'Nova Pessoa',
      password: 'SenhaForte1',
      confirmPassword: 'SenhaForte2',
    });
    expect(mismatch.error?.issues[0]?.path).toEqual(['confirmPassword']);
    expect(
      acceptInvitationSchema.safeParse({
        name: 'Nova',
        password: 'fraca',
        confirmPassword: 'fraca',
      }).success,
    ).toBe(false);
  });

  it('valida etapas com probabilidade inteira entre 0 e 100', () => {
    expect(stageSchema.parse({ name: ' Demonstração ', probability: '30' })).toEqual({
      name: 'Demonstração',
      probability: 30,
    });
    expect(stageSchema.safeParse({ name: 'Etapa', probability: 120 }).success).toBe(false);
    expect(stageSchema.safeParse({ name: 'Etapa', probability: 12.5 }).success).toBe(false);
  });

  it('rotula todas as ações de auditoria e as distribui em categorias', () => {
    const categorized = Object.values(AUDIT_CATEGORIES).flat();
    for (const action of AUDIT_ACTIONS) {
      expect(AUDIT_ACTION_LABELS[action]).toBeTruthy();
      expect(categorized).toContain(action);
    }
  });
});
