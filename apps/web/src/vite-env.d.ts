/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API. Padrão: `/api` (mesma origem, via proxy do Vite em desenvolvimento). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
