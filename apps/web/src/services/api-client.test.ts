import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia cookies e o token CSRF em requisições de escrita', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'token-1' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const { apiClient } = await import('./api-client');

    await apiClient.post('/auth/login', { email: 'a@b.example' });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', expect.anything());
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toBe('/api/auth/login');
    expect(init?.credentials).toBe('include');
    expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe('token-1');
  });

  it('não solicita token CSRF em leituras', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const { apiClient } = await import('./api-client');

    await apiClient.get('/auth/me');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/me');
  });

  it('renova o token e repete uma vez quando a API rejeita o CSRF', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'antigo' }))
      .mockResolvedValueOnce(
        jsonResponse(403, { statusCode: 403, code: 'CSRF_INVALID', message: 'Token inválido' }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { csrfToken: 'novo' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const { apiClient } = await import('./api-client');

    await expect(apiClient.post('/organizations/current')).resolves.toEqual({ ok: true });
    const retryHeaders = fetchMock.mock.calls[3]![1]?.headers as Record<string, string>;
    expect(retryHeaders['X-CSRF-Token']).toBe('novo');
  });

  it('normaliza erros da API em ApiError', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        message: 'Faça login para continuar.',
      }),
    );
    const { apiClient, ApiError } = await import('./api-client');

    const error = await apiClient.get('/auth/me').catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
  });

  it('converte falhas de rede em mensagem amigável', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { apiClient } = await import('./api-client');

    await expect(apiClient.get('/auth/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });
});
