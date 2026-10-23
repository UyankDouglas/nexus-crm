import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Token aleatório criptograficamente seguro, codificado em base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash SHA-256 em hexadecimal — usado para armazenar tokens sem guardar o valor original. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Comparação em tempo constante, evitando ataques de temporização. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
