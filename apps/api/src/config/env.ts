import { z } from 'zod';

const EXAMPLE_SECRET_MARKER = 'troque-por';

/** Variáveis opcionais vazias (ex.: `SMTP_URL=` no Docker Compose) contam como ausentes. */
const emptyAsUndefined = (value: unknown) => (value === '' ? undefined : value);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3333),
    APP_URL: z.url(),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    DATABASE_URL: z.string().min(1),
    CSRF_SECRET: z.string().min(32, 'CSRF_SECRET deve ter pelo menos 32 caracteres.'),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
    PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(10),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    /** Omitido: ligado em desenvolvimento e desligado em produção. */
    SWAGGER_ENABLED: z.preprocess(emptyAsUndefined, z.stringbool().optional()),
    MAIL_OUTBOX_DIR: z.string().default('.mail-outbox'),
    /** Servidor SMTP (ex.: `smtps://usuario:senha@smtp.exemplo.com:465`). Sem ele, não há envio real. */
    SMTP_URL: z.preprocess(
      emptyAsUndefined,
      z
        .url({ protocol: /^smtps?$/, error: 'SMTP_URL deve começar com smtp:// ou smtps://.' })
        .optional(),
    ),
    MAIL_FROM: z.string().min(3).default('NEXUS CRM <nao-responda@nexuscrm.local>'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.CSRF_SECRET.includes(EXAMPLE_SECRET_MARKER)) {
      ctx.addIssue({
        code: 'custom',
        path: ['CSRF_SECRET'],
        message: 'Defina um CSRF_SECRET aleatório em produção.',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }
  return result.data;
}
