import { useState } from 'react';

/**
 * Mantém o último valor não nulo. Drawers e diálogos usam o valor retido para continuar
 * mostrando o conteúdo durante a animação de fechamento, em vez de encolher vazios.
 */
export function useRetainedValue<T>(value: T | null): T | null {
  const [retained, setRetained] = useState(value);
  if (value !== null && value !== retained) setRetained(value);
  return value ?? retained;
}
