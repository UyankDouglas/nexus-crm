/**
 * Documentos e contatos brasileiros: normalização, validação e formatação.
 * O CNPJ segue o formato alfanumérico (IN RFB 2.229/2024, vigente desde julho de 2026):
 * as 12 primeiras posições aceitam letras e números; os dígitos verificadores são numéricos.
 */

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
const CNPJ_WEIGHTS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const CNPJ_WEIGHTS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Remove pontuação e padroniza letras em maiúsculas: "12.ABC.345/01DE-35" → "12ABC34501DE35". */
export function normalizeDocument(value: string): string {
  return value.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

function allSameCharacter(value: string): boolean {
  return value.split('').every((char) => char === value[0]);
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== CPF_LENGTH || allSameCharacter(cpf)) return false;

  const digits = cpf.split('').map(Number);
  const checkDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

/** Valor de cada caractere no cálculo do CNPJ alfanumérico: código ASCII − 48. */
function cnpjCharValue(char: string): number {
  return char.charCodeAt(0) - 48;
}

function cnpjCheckDigit(base: string, weights: number[]): number {
  const sum = base
    .split('')
    .reduce((total, char, index) => total + cnpjCharValue(char) * weights[index]!, 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCnpj(value: string): boolean {
  const cnpj = normalizeDocument(value);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || allSameCharacter(cnpj)) return false;

  const first = cnpjCheckDigit(cnpj.slice(0, 12), CNPJ_WEIGHTS_1);
  const second = cnpjCheckDigit(cnpj.slice(0, 12) + first, CNPJ_WEIGHTS_2);
  return cnpj.endsWith(`${first}${second}`);
}

/** Calcula os dígitos verificadores de uma base de 12 caracteres (útil para dados de teste). */
export function completeCnpj(base: string): string {
  const normalized = normalizeDocument(base);
  if (!/^[0-9A-Z]{12}$/.test(normalized)) throw new Error('Base de CNPJ inválida.');
  const first = cnpjCheckDigit(normalized, CNPJ_WEIGHTS_1);
  const second = cnpjCheckDigit(normalized + first, CNPJ_WEIGHTS_2);
  return `${normalized}${first}${second}`;
}

/** Calcula os dígitos verificadores de uma base de 9 dígitos (útil para dados de teste). */
export function completeCpf(base: string): string {
  const digits = onlyDigits(base);
  if (digits.length !== 9) throw new Error('Base de CPF inválida.');
  let result = digits;
  for (const length of [9, 10]) {
    const sum = result
      .split('')
      .map(Number)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    result += String(rest === 10 ? 0 : rest);
  }
  return result;
}

export function formatCpf(value: string): string {
  const cpf = onlyDigits(value);
  if (cpf.length !== CPF_LENGTH) return value;
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

export function formatCnpj(value: string): string {
  const cnpj = normalizeDocument(value);
  if (cnpj.length !== CNPJ_LENGTH) return value;
  return cnpj.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
}

/** Formata CPF (11 caracteres) ou CNPJ (14 caracteres) conforme o tamanho. */
export function formatDocument(value: string): string {
  const normalized = normalizeDocument(value);
  if (normalized.length === CPF_LENGTH) return formatCpf(normalized);
  if (normalized.length === CNPJ_LENGTH) return formatCnpj(normalized);
  return value;
}

/** Telefones brasileiros com DDD: "11987654321" → "(11) 98765-4321". */
export function formatPhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return digits.length > 11 ? `+${digits}` : value;
}
