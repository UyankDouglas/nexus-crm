import { applyDecorators } from '@nestjs/common';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@nexus/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

const normalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** E-mail obrigatório, normalizado (sem espaços e em minúsculas). */
export function NormalizedEmail() {
  return applyDecorators(
    Transform(normalizeEmail),
    IsEmail({}, { message: 'Informe um e-mail válido.' }),
    MaxLength(254, { message: 'E-mail muito longo.' }),
  );
}

/** Política de senha — espelha `passwordSchema` do pacote compartilhado. */
export function StrongPassword() {
  return applyDecorators(
    IsString({ message: 'Informe a senha.' }),
    MinLength(PASSWORD_MIN_LENGTH, {
      message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    }),
    MaxLength(PASSWORD_MAX_LENGTH, {
      message: `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres.`,
    }),
    Matches(/[A-Za-z]/, { message: 'A senha deve conter pelo menos uma letra.' }),
    Matches(/\d/, { message: 'A senha deve conter pelo menos um número.' }),
  );
}

/** Texto obrigatório com espaços removidos nas extremidades. */
export function TrimmedText(label: string, min: number, max: number) {
  return applyDecorators(
    Transform(trim),
    IsString({ message: `Informe ${label}.` }),
    MinLength(min, { message: `${capitalize(label)} deve ter pelo menos ${min} caracteres.` }),
    MaxLength(max, { message: `${capitalize(label)} deve ter no máximo ${max} caracteres.` }),
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
