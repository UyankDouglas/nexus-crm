/**
 * Aceita apenas caminhos internos (ex.: "/clientes?pagina=2") como destino após o login,
 * evitando redirecionamentos abertos para outros domínios.
 */
export function safeRedirect(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  return value;
}
