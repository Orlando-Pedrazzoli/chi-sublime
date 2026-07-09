'use client';

import { useMemo } from 'react';
import { useToastContext } from '@/components/ui/Toast';

/**
 * Hook para disparar notificações toast.
 *
 * @example
 * const toast = useToast();
 * toast.success('Reserva criada');
 * toast.error('Não foi possível guardar');
 */
export function useToast() {
  const { push } = useToastContext();
  return useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
      info: (message: string) => push('info', message),
      warning: (message: string) => push('warning', message),
    }),
    [push],
  );
}
