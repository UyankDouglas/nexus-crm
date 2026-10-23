import { z } from 'zod';
import { isValidCnpj, isValidCpf, normalizeDocument, onlyDigits } from './documents.js';

export const CUSTOMER_TYPES = ['COMPANY', 'PERSON'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  COMPANY: 'Empresa',
  PERSON: 'Pessoa física',
};

export const CUSTOMER_STATUSES = ['LEAD', 'ACTIVE', 'INACTIVE'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  LEAD: 'Lead',
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
};

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const; // prettier-ignore
export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

export const CUSTOMER_SORTS = ['name', 'recent', 'updated'] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

export const CUSTOMER_SORT_LABELS: Record<CustomerSort, string> = {
  name: 'Nome (A–Z)',
  recent: 'Cadastro mais recente',
  updated: 'Atualização mais recente',
};

export const PAGE_SIZES = [10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const CUSTOMER_LIMITS = {
  name: 160,
  tradeName: 160,
  email: 254,
  website: 200,
  city: 80,
  notes: 5000,
  tags: 10,
  tagLength: 30,
  phoneMin: 10,
  phoneMax: 15,
} as const;

export const CONTACT_LIMITS = {
  name: 120,
  position: 80,
  notes: 1000,
} as const;

/** Filtro de responsável: `me` (os meus), `none` (sem responsável) ou o ID de um usuário. */
export const OWNER_FILTER_ME = 'me';
export const OWNER_FILTER_NONE = 'none';

/** Remove espaços extras e duplicatas (sem diferenciar maiúsculas), preservando a 1ª grafia. */
export function normalizeTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/\s+/g, ' ');
    const key = tag.toLocaleLowerCase('pt-BR');
    if (tag && !seen.has(key)) {
      seen.add(key);
      result.push(tag);
    }
  }
  return result;
}

export function isValidDocumentFor(type: CustomerType, document: string): boolean {
  return type === 'COMPANY' ? isValidCnpj(document) : isValidCpf(document);
}

export function documentLabel(type: CustomerType): 'CNPJ' | 'CPF' {
  return type === 'COMPANY' ? 'CNPJ' : 'CPF';
}

// ---------------------------------------------------------------------------
// Schemas Zod (formulários do frontend). A API valida os mesmos limites com DTOs.
// Campos opcionais aceitam texto vazio e são normalizados para `null`.
// ---------------------------------------------------------------------------

const blankToNull = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? null : value;

const optionalText = (max: number, label: string) =>
  z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(max, `${label} deve ter no máximo ${max} caracteres.`)
      .nullable()
      .optional(),
  );

const optionalEmail = z.preprocess(
  blankToNull,
  z
    .string()
    .trim()
    .toLowerCase()
    .max(CUSTOMER_LIMITS.email, 'E-mail muito longo.')
    .pipe(z.email('Informe um e-mail válido.'))
    .nullable()
    .optional(),
);

const optionalPhone = z.preprocess((value) => {
  const blank = blankToNull(value);
  return typeof blank === 'string' ? onlyDigits(blank) : blank;
}, z.string().min(CUSTOMER_LIMITS.phoneMin, 'Informe o telefone com DDD.').max(CUSTOMER_LIMITS.phoneMax, 'Telefone muito longo.').nullable().optional());

const optionalWebsite = z.preprocess(
  blankToNull,
  z
    .string()
    .trim()
    .max(CUSTOMER_LIMITS.website, 'Endereço muito longo.')
    .pipe(z.url({ protocol: /^https?$/, error: 'Informe um endereço começando com http(s)://' }))
    .nullable()
    .optional(),
);

const optionalDocument = z.preprocess((value) => {
  const blank = blankToNull(value);
  return typeof blank === 'string' ? normalizeDocument(blank) : blank;
}, z.string().nullable().optional());

const optionalUuid = z.preprocess(blankToNull, z.uuid('Valor inválido.').nullable().optional());

export const tagsSchema = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(
        CUSTOMER_LIMITS.tagLength,
        `Cada tag deve ter no máximo ${CUSTOMER_LIMITS.tagLength} caracteres.`,
      ),
  )
  .transform(normalizeTags)
  .refine((tags) => tags.length <= CUSTOMER_LIMITS.tags, {
    message: `Use no máximo ${CUSTOMER_LIMITS.tags} tags.`,
  });

const customerFields = {
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(CUSTOMER_LIMITS.name, `O nome deve ter no máximo ${CUSTOMER_LIMITS.name} caracteres.`),
  tradeName: optionalText(CUSTOMER_LIMITS.tradeName, 'O nome fantasia'),
  document: optionalDocument,
  companyId: optionalUuid,
  email: optionalEmail,
  phone: optionalPhone,
  website: optionalWebsite,
  city: optionalText(CUSTOMER_LIMITS.city, 'A cidade'),
  state: z.preprocess(blankToNull, z.enum(BRAZILIAN_STATES).nullable().optional()),
  status: z.enum(CUSTOMER_STATUSES),
  ownerId: optionalUuid,
  tags: tagsSchema,
  notes: optionalText(CUSTOMER_LIMITS.notes, 'As observações'),
};

export const customerSchema = z
  .object({ type: z.enum(CUSTOMER_TYPES), ...customerFields })
  .superRefine((data, ctx) => {
    if (data.document && !isValidDocumentFor(data.type, data.document)) {
      ctx.addIssue({
        code: 'custom',
        path: ['document'],
        message: `Informe um ${documentLabel(data.type)} válido.`,
      });
    }
    if (data.type === 'COMPANY' && data.companyId) {
      ctx.addIssue({
        code: 'custom',
        path: ['companyId'],
        message: 'Apenas pessoas físicas podem ser vinculadas a uma empresa.',
      });
    }
  });

export type CustomerFormValues = z.input<typeof customerSchema>;
export type CustomerInput = z.output<typeof customerSchema>;
/** O tipo do cliente não muda após o cadastro. */
export type CustomerUpdateInput = Partial<Omit<CustomerInput, 'type'>>;

export const contactSchema = z.object({
  name: z
    .string({ error: 'Informe o nome.' })
    .trim()
    .min(2, 'O nome deve ter pelo menos 2 caracteres.')
    .max(CONTACT_LIMITS.name, `O nome deve ter no máximo ${CONTACT_LIMITS.name} caracteres.`),
  email: optionalEmail,
  phone: optionalPhone,
  position: optionalText(CONTACT_LIMITS.position, 'O cargo'),
  isPrimary: z.boolean(),
  notes: optionalText(CONTACT_LIMITS.notes, 'As observações'),
});

export type ContactFormValues = z.input<typeof contactSchema>;
export type ContactInput = z.output<typeof contactSchema>;
