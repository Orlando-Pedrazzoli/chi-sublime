'use client';

/**
 * Chi Sublime — useBookingFlow Hook
 * ============================================================
 *
 * State management central do fluxo de reserva (3 passos).
 *
 * Decisoes:
 *  - Persiste em sessionStorage (sobrevive a F5 mas reset ao fechar browser)
 *  - State partilhado entre /marcacoes, /marcacoes/horario, /marcacoes/confirmar
 *  - Calcula totais (duracao + preco) automaticamente
 *  - Reset automatico quando reserva e concluida com sucesso
 *
 * Uso:
 *   const { selectedServiceIds, addService, totals, ... } = useBookingFlow();
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// ============================================================
// TIPOS
// ============================================================

export type BookingFlowService = {
  id: string;
  name: string;
  duration: number; // minutos
  bufferAfter: number;
  price: number; // centimos
};

export type BookingFlowState = {
  /** Servicos selecionados (com snapshot do nome/preco/duracao) */
  selectedServices: BookingFlowService[];

  /** Staff selecionado (ou "any") — definido no Step 2 */
  staffId: string | 'any' | null;

  /** Data ISO YYYY-MM-DD — definida no Step 2 */
  date: string | null;

  /** Hora HH:MM — definida no Step 2 */
  time: string | null;

  /** Nome do staff atribuido pelo algoritmo (snapshot para Step 3) */
  assignedStaffName: string | null;

  /** Dados do cliente — definidos no Step 3 */
  guestInfo: {
    name: string;
    email: string;
    phone: string;
  } | null;

  /** Notas opcionais */
  notes: string;
};

const STORAGE_KEY = 'chi-booking-flow';
const MAX_SERVICES = 5;

const INITIAL_STATE: BookingFlowState = {
  selectedServices: [],
  staffId: null,
  date: null,
  time: null,
  assignedStaffName: null,
  guestInfo: null,
  notes: '',
};

// ============================================================
// SESSION STORAGE HELPERS
// ============================================================

function readState(): BookingFlowState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as BookingFlowState;
    // Validacao basica de shape
    if (!Array.isArray(parsed.selectedServices)) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...parsed };
  } catch {
    return INITIAL_STATE;
  }
}

function writeState(state: BookingFlowState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Notifica outras tabs/componentes
    window.dispatchEvent(new Event('chi-booking-flow-change'));
  } catch {
    // sessionStorage cheio ou indisponivel — falha silenciosa
  }
}

// ============================================================
// EXTERNAL STORE (React 19 best practice)
// ============================================================

let cachedState: BookingFlowState | null = null;

/**
 * Flag "a sair do funil": ligada pelo Step3Client no instante em que a
 * reserva é criada e antes da hard navigation para /conta/reservas.
 * Enquanto estiver ligada, o BookingFlowGuard NÃO redireciona — evita a
 * corrida que no Safari iOS mandava o cliente de volta ao passo 1.
 * (Uma hard navigation reinicia o módulo, por isso volta a false sozinha.)
 */
let leavingFlow = false;

export function markLeavingFlow(): void {
  leavingFlow = true;
}

export function isLeavingFlow(): boolean {
  return leavingFlow;
}

/**
 * Limpa o carrinho directamente no sessionStorage, sem passar pelo hook
 * e sem disparar eventos. Usado na página de destino (/conta/reservas)
 * depois de uma reserva criada — o funil já não está montado.
 */
export function clearBookingFlowStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sessionStorage indisponível (modo privado antigo) — ignorar */
  }
  cachedState = INITIAL_STATE;
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    cachedState = null; // invalida cache
    callback();
  };
  window.addEventListener('chi-booking-flow-change', handler);
  window.addEventListener('storage', handler); // noutras tabs
  return () => {
    window.removeEventListener('chi-booking-flow-change', handler);
    window.removeEventListener('storage', handler);
  };
}

function getSnapshot(): BookingFlowState {
  if (cachedState === null) {
    cachedState = readState();
  }
  return cachedState;
}

function getServerSnapshot(): BookingFlowState {
  return INITIAL_STATE;
}

// ============================================================
// HOOK PRINCIPAL
// ============================================================

export function useBookingFlow() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ============================================================
  // SETTERS
  // ============================================================

  const updateState = useCallback((updates: Partial<BookingFlowState>) => {
    const current = readState();
    const newState = { ...current, ...updates };
    cachedState = newState;
    writeState(newState);
  }, []);

  const addService = useCallback((service: BookingFlowService) => {
    const current = readState();
    // Evitar duplicados
    if (current.selectedServices.some((s) => s.id === service.id)) return;
    // Limite de servicos
    if (current.selectedServices.length >= MAX_SERVICES) return;

    const newState = {
      ...current,
      selectedServices: [...current.selectedServices, service],
    };
    cachedState = newState;
    writeState(newState);
  }, []);

  const removeService = useCallback((serviceId: string) => {
    const current = readState();
    const newState = {
      ...current,
      selectedServices: current.selectedServices.filter((s) => s.id !== serviceId),
    };
    cachedState = newState;
    writeState(newState);
  }, []);

  const toggleService = useCallback((service: BookingFlowService) => {
    const current = readState();
    const exists = current.selectedServices.some((s) => s.id === service.id);
    if (exists) {
      const newState = {
        ...current,
        selectedServices: current.selectedServices.filter((s) => s.id !== service.id),
      };
      cachedState = newState;
      writeState(newState);
    } else if (current.selectedServices.length < MAX_SERVICES) {
      const newState = {
        ...current,
        selectedServices: [...current.selectedServices, service],
      };
      cachedState = newState;
      writeState(newState);
    }
  }, []);

  /**
   * Limpa o carrinho.
   *
   * `silent: true` — limpa o sessionStorage SEM disparar o evento
   * 'chi-booking-flow-change'. Usado imediatamente antes de uma hard
   * navigation (window.location.href) após criar a reserva: se o
   * evento disparasse, o BookingFlowGuard reagia (selectedServices
   * vazio) e fazia router.replace('/marcacoes'), competindo com o
   * redirect para /conta/reservas — o cliente voltava ao passo 1 em
   * vez de ver o modal de confirmação.
   */
  const clearFlow = useCallback((options?: { silent?: boolean }) => {
    cachedState = INITIAL_STATE;
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY);
      if (!options?.silent) {
        window.dispatchEvent(new Event('chi-booking-flow-change'));
      }
    }
  }, []);

  // ============================================================
  // VALORES CALCULADOS
  // ============================================================

  // Duracao total (servicos + buffers entre eles)
  const totalDuration = state.selectedServices.reduce((sum, s, idx, arr) => {
    return (
      sum + s.duration + (idx < arr.length - 1 ? s.bufferAfter : 0) // buffer apos exceto o ultimo
    );
  }, 0);

  // Preco total (centimos)
  const totalPrice = state.selectedServices.reduce((sum, s) => sum + s.price, 0);

  const totals = {
    duration: totalDuration,
    price: totalPrice,
    count: state.selectedServices.length,
  };

  return {
    // Estado
    selectedServices: state.selectedServices,
    selectedServiceIds: state.selectedServices.map((s) => s.id),
    staffId: state.staffId,
    date: state.date,
    time: state.time,
    assignedStaffName: state.assignedStaffName,
    guestInfo: state.guestInfo,
    notes: state.notes,

    // Actions
    addService,
    removeService,
    toggleService,
    updateState,
    clearFlow,

    // Computed
    totals,
    canProceedFromStep1: state.selectedServices.length > 0,
    isMaxServicesReached: state.selectedServices.length >= MAX_SERVICES,
  };
}

// ============================================================
// HOOK AUXILIAR — para hidratacao (evita SSR mismatch)
// ============================================================

/**
 * Hook que devolve true apos a hidratacao no client.
 * Util para mostrar conteudo dependente de sessionStorage so apos hidratar.
 */
export function useIsHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);
  return isHydrated;
}
