import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { generateToken } from '../../common/security/tokens';

/** Parâmetros Argon2id recomendados pela OWASP (19 MiB de memória, 2 iterações). */
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordHasherService {
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return argon2.hash(password, HASH_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, HASH_OPTIONS);
  }

  /**
   * Executa uma verificação contra um hash descartável quando o usuário não existe,
   * igualando o tempo de resposta e dificultando a enumeração de e-mails.
   */
  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= this.hash(generateToken());
    await this.verify(await this.dummyHash, password);
  }
}
