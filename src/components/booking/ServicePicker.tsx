'use client';

/**
 * Chi Sublime — Service Picker (Step 1)
 * ============================================================
 *
 * Accordion de categorias com lista de servicos para o cliente
 * escolher um ou mais para a reserva.
 *
 * Visual:
 *  - Cada categoria como "row" com nome + numero servicos + chevron
 *  - Click expande para mostrar servicos (animacao smooth)
 *  - Cada servico: checkbox + nome + duracao + preco
 *  - Selecionados: fundo creme escuro + checkbox dourado
 *
 * State management via useBookingFlow hook (sessionStorage).
 */

import { useState } from 'react';
import { useBookingFlow, type BookingFlowService } from '@/hooks/useBookingFlow';
import { cn } from '@/lib/utils/cn';

// ============================================================
// TIPOS
// ============================================================

export type CategoryWithServices = {
  id: string;
  slug: string;
  name: string;
  services: ServiceData[];
};

export type ServiceData = {
  id: string;
  name: string;
  duration: number;
  bufferAfter: number;
  price: number;
  popular: boolean;
};

type Props = {
  categories: CategoryWithServices[];
  /** Slug pre-aberto (vindo de query string ?categoria=cabelereiro) */
  initialOpenSlug?: string;
};

// ============================================================
// HELPERS
// ============================================================

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export function ServicePicker({ categories, initialOpenSlug }: Props) {
  const { selectedServiceIds, toggleService, isMaxServicesReached } = useBookingFlow();

  // Estado de quais categorias estao expandidas
  const [openSlugs, setOpenSlugs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (initialOpenSlug) initial.add(initialOpenSlug);
    return initial;
  });

  const toggleCategory = (slug: string) => {
    setOpenSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleServiceToggle = (service: ServiceData) => {
    const flowService: BookingFlowService = {
      id: service.id,
      name: service.name,
      duration: service.duration,
      bufferAfter: service.bufferAfter,
      price: service.price,
    };
    toggleService(flowService);
  };

  return (
    <div className="space-y-3">
      {categories.map((category) => {
        const isOpen = openSlugs.has(category.slug);
        const selectedInCategory = category.services.filter((s) =>
          selectedServiceIds.includes(s.id),
        ).length;

        return (
          <div
            key={category.id}
            className="border-chi-border bg-chi-cream hover:shadow-soft overflow-hidden rounded-lg border transition-shadow"
          >
            {/* CATEGORY HEADER (clicavel) */}
            <button
              onClick={() => toggleCategory(category.slug)}
              className="hover:bg-chi-sand/30 flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors"
              aria-expanded={isOpen}
              aria-controls={`category-${category.slug}`}
            >
              <div className="flex items-center gap-4">
                <h3 className="text-chi-charcoal font-serif text-2xl font-light md:text-3xl">
                  {category.name}
                </h3>
                {selectedInCategory > 0 && (
                  <span className="bg-chi-gold text-chi-green-deep rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase">
                    {selectedInCategory} selecionado
                    {selectedInCategory > 1 && 's'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-chi-charcoal-light text-xs tracking-[0.2em] uppercase">
                  {category.services.length} serviços
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={cn(
                    'text-chi-gold-deep transition-transform duration-300',
                    isOpen && 'rotate-180',
                  )}
                >
                  <polyline points="3 5 7 9 11 5" />
                </svg>
              </div>
            </button>

            {/* SERVICES LIST (expandible) */}
            <div
              id={`category-${category.slug}`}
              className={cn(
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-[2000px]' : 'max-h-0',
              )}
            >
              <ul className="divide-chi-border-light border-chi-border divide-y border-t">
                {category.services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  const isDisabled = !isSelected && isMaxServicesReached;

                  return (
                    <li key={service.id}>
                      <button
                        onClick={() => handleServiceToggle(service)}
                        disabled={isDisabled}
                        className={cn(
                          'flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-all',
                          isSelected
                            ? 'bg-chi-sand/60 hover:bg-chi-sand/80'
                            : 'hover:bg-chi-sand/30',
                          isDisabled && 'cursor-not-allowed opacity-50',
                        )}
                        aria-pressed={isSelected}
                      >
                        {/* Checkbox custom */}
                        <div
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
                            isSelected
                              ? 'border-chi-gold bg-chi-gold'
                              : 'border-chi-charcoal-light/40 bg-transparent',
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 12 12"
                              fill="none"
                              stroke="#1F3D2E"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="2.5 6.5 5 9 9.5 3.5" />
                            </svg>
                          )}
                        </div>

                        {/* Nome + popular badge */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'font-serif text-base font-normal md:text-lg',
                                isSelected ? 'text-chi-green-deep' : 'text-chi-charcoal',
                              )}
                            >
                              {service.name}
                            </span>
                            {service.popular && (
                              <span className="text-chi-gold-deep border-chi-gold/40 rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.2em] uppercase">
                                Popular
                              </span>
                            )}
                          </div>
                          <span className="text-chi-charcoal-light mt-0.5 block text-xs">
                            {formatDuration(service.duration)}
                          </span>
                        </div>

                        {/* Preco */}
                        <span
                          className={cn(
                            'shrink-0 font-mono text-base font-medium md:text-lg',
                            isSelected ? 'text-chi-green-deep' : 'text-chi-charcoal',
                          )}
                        >
                          {formatPrice(service.price)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}

      {/* Aviso de limite */}
      {isMaxServicesReached && (
        <p className="text-chi-charcoal-light pt-4 text-center text-sm italic">
          Atingiu o máximo de 5 serviços por reserva. Para escolher outro, remova um dos
          selecionados.
        </p>
      )}
    </div>
  );
}
