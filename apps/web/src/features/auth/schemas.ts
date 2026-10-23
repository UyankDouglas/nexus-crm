import { passwordSchema, registerSchema } from '@nexus/shared';
import { z } from 'zod';

export { forgotPasswordSchema, loginSchema } from '@nexus/shared';

const confirmPasswordSchema = z.string().min(1, 'Confirme a senha.');

const passwordsMatch = (data: { password: string; confirmPassword: string }) =>
  data.password === data.confirmPassword;

const mismatch = { message: 'As senhas não conferem.', path: ['confirmPassword'] };

export const registerFormSchema = registerSchema
  .extend({ confirmPassword: confirmPasswordSchema })
  .refine(passwordsMatch, mismatch);

export const resetPasswordFormSchema = z
  .object({ password: passwordSchema, confirmPassword: confirmPasswordSchema })
  .refine(passwordsMatch, mismatch);
