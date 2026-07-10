// 📄 src/hooks/useDebounce.ts
'use client';

import { useEffect, useState } from 'react';

/**
 * Devolve o valor "atrasado" — só atualiza `delay` ms após a última
 * mudança. Útil para pesquisa (evita disparar a query a cada tecla).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
