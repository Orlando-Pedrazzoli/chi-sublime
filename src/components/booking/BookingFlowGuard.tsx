'use client';

/**
 * Chi Sublime — Booking Flow Guard
 * ============================================================
 *
 * Componente que protege rotas do flow de reserva.
 * Se o utilizador chegar a /reservar/horario sem ter passado pelo
 * Step 1 (sessionStorage vazio), redireciona para /reservar.
 *
 * Comportamento:
 *  - Aguarda hidratacao
 *  - Verifica se ha servicos selecionados
 *  - Se nao, redirect via router.replace
 *  - Mostra placeholder enquanto verifica
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBookingFlow, useIsHydrated } from '@/hooks/useBookingFlow';

type Props = {
  /** O que mostrar enquanto verifica (ou se redirect estiver em curso) */
  fallback?: React.ReactNode;
  /** Conteudo a mostrar se passar a verificacao */
  children: React.ReactNode;
  /** Step minimo necessario para aceder a esta pagina */
  requireStep: 'service' | 'time';
};

export function BookingFlowGuard({ fallback, children, requireStep }: Props) {
  const isHydrated = useIsHydrated();
  const router = useRouter();
  const { selectedServices, date, time } = useBookingFlow();

  useEffect(() => {
    if (!isHydrated) return;

    // Step "time" requires services selected
    if (requireStep === 'time' && selectedServices.length === 0) {
      router.replace('/reservar');
      return;
    }

    // Step "confirm" requires services + date + time
    if (requireStep === 'service' && (!date || !time || selectedServices.length === 0)) {
      router.replace('/reservar');
      return;
    }
  }, [isHydrated, requireStep, selectedServices, date, time, router]);

  // Aguardar hidratacao para evitar SSR mismatch
  if (!isHydrated) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  // Se condicao nao cumprida, mostra fallback enquanto redirect acontece
  if (requireStep === 'time' && selectedServices.length === 0) {
    return <>{fallback ?? <DefaultFallback />}</>;
  }

  return <>{children}</>;
}

function DefaultFallback() {
  return (
    <div className="bg-chi-cream flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-chi-charcoal-soft font-serif italic">A carregar...</p>
      </div>
    </div>
  );
}
