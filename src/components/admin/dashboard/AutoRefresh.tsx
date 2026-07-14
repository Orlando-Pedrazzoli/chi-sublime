// 📄 src/components/admin/dashboard/AutoRefresh.tsx
'use client';

/**
 * Chi Sublime — Dashboard Auto Refresh
 * ============================================================
 *
 * Refresca os dados do dashboard (router.refresh) a cada N
 * segundos, para o Jean deixar o painel aberto no telemóvel/
 * tablet do balcão e ver reservas novas a chegar sem F5.
 *
 * Pausa quando o separador está oculto (poupa bateria e
 * queries) e refresca imediatamente ao voltar a ficar visível.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function DashboardAutoRefresh({ seconds = 120 }: { seconds?: number }) {
  const router = useRouter();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(() => router.refresh(), seconds * 1000);
    };

    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
        start();
      } else {
        stop();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router, seconds]);

  return null;
}
