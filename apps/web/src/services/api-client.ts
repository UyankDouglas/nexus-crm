import type { ApiErrorBody, ApiErrorCode, CsrfResponse } from '@nexus/shared';

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '');
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type ClientErrorCode = ApiErrorCode | 'NETWORK_ERROR';

/** Erro normalizado de qualquer chamada à API. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown, code?: ClientErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
}

// O token CSRF fica apenas em memória; o cookie de sessão é HttpOnly e nunca é lido pelo JS.
let csrfToken: string | null = null;
let pendingCsrf: Promise<string> | null = null;

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) return csrfToken;
  pendingCsrf ??= send<CsrfResponse>('GET', '/auth/csrf')
    .then(({ csrfToken: token }) => {
      csrfToken = token;
      return token;
    })
    .finally(() => {
      pendingCsrf = null;
    });
  return pendingCsrf;
}

async function send<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (UNSAFE_METHODS.has(method)) headers['X-CSRF-Token'] = await getCsrfToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    );
  }

  if (response.status === 204) return undefined as T;

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (data ?? {}) as Partial<ApiErrorBody>;
    throw new ApiError(
      response.status,
      body.code ?? 'INTERNAL_ERROR',
      body.message ?? 'Ocorreu um erro inesperado. Tente novamente.',
      body.fieldErrors,
      body.requestId,
    );
  }

  return data as T;
}

async function request<T>(method: HttpMethod, path: string, options?: RequestOptions): Promise<T> {
  try {
    return await send<T>(method, path, options);
  } catch (error) {
    // Token CSRF expirado ou rotacionado: renova uma única vez e repete a requisição.
    if (isApiError(error, 'CSRF_INVALID') && UNSAFE_METHODS.has(method)) {
      await getCsrfToken(true);
      return send<T>(method, path, options);
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};
