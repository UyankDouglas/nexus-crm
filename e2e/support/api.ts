import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Chamadas diretas à API com a sessão do contexto (cookies) e o token CSRF — usadas para
 * preparar dados e para conferir respostas que a interface não mostra (ex.: status 404).
 */
export class Api {
  private csrfToken?: string;

  constructor(private readonly request: APIRequestContext) {}

  private async csrf(): Promise<string> {
    if (!this.csrfToken) {
      const response = await this.request.get('/api/auth/csrf');
      expect(response.status()).toBe(200);
      this.csrfToken = ((await response.json()) as { csrfToken: string }).csrfToken;
    }
    return this.csrfToken;
  }

  get(path: string) {
    return this.request.get(`/api${path}`);
  }

  async post<T>(path: string, data: object): Promise<T> {
    const response = await this.request.post(`/api${path}`, {
      data,
      headers: { 'X-CSRF-Token': await this.csrf() },
    });
    expect(response.ok(), `POST ${path} → ${response.status()}`).toBe(true);
    return (await response.json()) as T;
  }

  /** Primeiro registro de uma listagem paginada que contenha o termo buscado. */
  async findId(path: string, search: string): Promise<string> {
    const response = await this.get(`${path}?search=${encodeURIComponent(search)}`);
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { data: Array<{ id: string }> };
    expect(body.data.length, `nenhum resultado para "${search}" em ${path}`).toBeGreaterThan(0);
    return body.data[0]!.id;
  }
}
