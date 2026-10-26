import { applyDecorators } from '@nestjs/common';
import {
  CUSTOMER_LIMITS,
  isActivityDateAllowed,
  isValidIsoDate,
  normalizeDocument,
  normalizeTags,
  onlyDigits,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@nexus/shared';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateBy,
} from 'class-validator';

type TransformParams = { value: unknown };

const trim = ({ value }: TransformParams) => (typeof value === 'string' ? value.trim() : value);

const normalizeEmail = ({ value }: TransformParams) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** Texto vazio vira `null` — permite limpar campos opcionais em atualizações parciais. */
const blankToNull = (transform: (value: string) => string) => {
  return ({ value }: TransformParams) => {
    if (typeof value !== 'string') return value;
    const result = transform(value);
    return result === '' ? null : result;
  };
};

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

/** Texto opcional; vazio é gravado como `null`. */
export function OptionalText(label: string, max: number) {
  return applyDecorators(
    Transform(blankToNull((value) => value.trim())),
    IsOptional(),
    IsString({ message: 'Valor inválido.' }),
    MaxLength(max, { message: `${capitalize(label)} deve ter no máximo ${max} caracteres.` }),
  );
}

export function OptionalEmail() {
  return applyDecorators(
    Transform(blankToNull((value) => value.trim().toLowerCase())),
    IsOptional(),
    IsEmail({}, { message: 'Informe um e-mail válido.' }),
    MaxLength(CUSTOMER_LIMITS.email, { message: 'E-mail muito longo.' }),
  );
}

/** Telefone opcional, armazenado somente com dígitos (DDD obrigatório). */
export function OptionalPhone() {
  return applyDecorators(
    Transform(blankToNull(onlyDigits)),
    IsOptional(),
    Matches(/^\d{10,15}$/, { message: 'Informe o telefone com DDD.' }),
  );
}

/** CPF/CNPJ sem pontuação. A validação dos dígitos depende do tipo do cliente (no service). */
export function OptionalDocument() {
  return applyDecorators(
    Transform(blankToNull(normalizeDocument)),
    IsOptional(),
    IsString({ message: 'Documento inválido.' }),
    MaxLength(14, { message: 'Documento inválido.' }),
  );
}

export function OptionalUrl() {
  return applyDecorators(
    Transform(blankToNull((value) => value.trim())),
    IsOptional(),
    IsUrl(
      { protocols: ['http', 'https'], require_protocol: true },
      { message: 'Informe um endereço começando com http(s)://' },
    ),
    MaxLength(CUSTOMER_LIMITS.website, { message: 'Endereço muito longo.' }),
  );
}

export function OptionalUuid(message = 'Valor inválido.') {
  return applyDecorators(
    Transform(blankToNull((value) => value.trim())),
    IsOptional(),
    IsUUID('all', { message }),
  );
}

/** Lista de tags normalizada (sem duplicatas, sem espaços extras). */
export function Tags() {
  return applyDecorators(
    Transform(({ value }: TransformParams) =>
      Array.isArray(value) && value.every((tag) => typeof tag === 'string')
        ? normalizeTags(value as string[])
        : value,
    ),
    IsOptional(),
    IsArray({ message: 'As tags devem ser uma lista.' }),
    ArrayMaxSize(CUSTOMER_LIMITS.tags, {
      message: `Use no máximo ${CUSTOMER_LIMITS.tags} tags.`,
    }),
    IsString({ each: true, message: 'Tag inválida.' }),
    MaxLength(CUSTOMER_LIMITS.tagLength, {
      each: true,
      message: `Cada tag deve ter no máximo ${CUSTOMER_LIMITS.tagLength} caracteres.`,
    }),
  );
}

/** Data de calendário opcional no formato AAAA-MM-DD (rejeita datas inexistentes). */
export function OptionalIsoDate() {
  return applyDecorators(
    Transform(blankToNull((value) => value.trim())),
    IsOptional(),
    ValidateBy({
      name: 'isIsoDate',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidIsoDate(value),
        defaultMessage: () => 'Informe uma data válida.',
      },
    }),
  );
}

/** Data de calendário obrigatória no formato AAAA-MM-DD. */
export function IsoDate(message = 'Informe uma data válida.') {
  return applyDecorators(
    Transform(trim),
    ValidateBy({
      name: 'isIsoDate',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isValidIsoDate(value),
        defaultMessage: () => message,
      },
    }),
  );
}

/**
 * Data e hora ISO 8601 que não esteja no futuro (com a mesma tolerância do frontend). Usada em
 * registros de algo que já aconteceu, como atividades.
 */
export function PastDateTime() {
  return applyDecorators(
    ValidateBy({
      name: 'isPastDateTime',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) &&
          !Number.isNaN(Date.parse(value)) &&
          isActivityDateAllowed(new Date(value)),
        defaultMessage: (args) =>
          typeof args?.value === 'string' && !Number.isNaN(Date.parse(args.value))
            ? 'A atividade não pode estar no futuro. Para compromissos, crie uma tarefa.'
            : 'Informe uma data e hora válidas.',
      },
    }),
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
