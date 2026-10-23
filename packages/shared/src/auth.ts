import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z
  .string({ error: 'Informe o e-mail.' })
  .trim()
  .min(1, 'Informe o e-mail.')
  .max(254, 'E-mail muito longo.')
  .pipe(z.email('Informe um e-mail válido.'))
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string({ error: 'Informe a senha.' })
  .min(PASSWORD_MIN_LENGTH, `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(PASSWORD_MAX_LENGTH, `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`)
  .regex(/[A-Za-z]/, 'A senha deve conter pelo menos uma letra.')
  .regex(/\d/, 'A senha deve conter pelo menos um número.');

export const personNameSchema = z
  .string({ error: 'Informe o nome.' })
  .trim()
  .min(2, 'O nome deve ter pelo menos 2 caracteres.')
  .max(120, 'O nome deve ter no máximo 120 caracteres.');

export const organizationNameSchema = z
  .string({ error: 'Informe o nome da organização.' })
  .trim()
  .min(2, 'O nome da organização deve ter pelo menos 2 caracteres.')
  .max(120, 'O nome da organização deve ter no máximo 120 caracteres.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Informe a senha.' }).min(1, 'Informe a senha.'),
});

export const registerSchema = z.object({
  organizationName: organizationNameSchema,
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Link de redefinição inválido.'),
  password: passwordSchema,
});

export const switchOrganizationSchema = z.object({
  organizationId: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type SwitchOrganizationInput = z.infer<typeof switchOrganizationSchema>;
