// 📄 src/components/booking/ServicePicker.tsx
'use client';

/**
 * Chi Sublime — Service Picker (Step 1)
 * ============================================================
 *
 * Accordion de categorias com lista de servicos para o cliente
 * escolher um ou mais para a reserva.
 *
 * ELEGIBILIDADE (set. 2026):
 *  Uma marcação é feita por UM profissional, do princípio ao fim
 *  (regra do motor de disponibilidade). Se o cliente combinar um
 *  serviço que só X faz com outro que só Y faz, ninguém pode fazer
 *  a marcação inteira e o passo 2 ficava sem datas, sem explicação.
 *
 *  Agora, com o carrinho não vazio, os serviços sem nenhum
 *  profissional em comum com o carrinho ficam DESATIVADOS COM
 *  EXPLICAÇÃO (badge "Marcação separada" + clique mostra o aviso),
 *  em vez de escondidos ou de rebentarem mais à frente.
 *  Padrão: Nielsen, "Inactive controls: show, disable or hide".
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useBookingFlow, type BookingFlowService } from '@/hooks/useBookingFlow';
import {
  getQualifiedStaffIds,
  getStaffNamesForService,
  isServiceCompatibleWithCart,
  joinNames,
  type EligibleStaff,
} from '@/lib/booking/eligibility';
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
  /** Profissionais que fazem o serviço (vazio = qualquer um) */
  staffIds: string[];
};

export type StaffLite = EligibleStaff;

type Props = {
  categories: CategoryWithServices[];
  staff: StaffLite[];
  initialOpenSlug?: string;
};

type Notice = {
  serviceId: string;
  message: string;
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

export function ServicePicker({ categories, staff, initialOpenSlug }: Props) {
  const t = useTranslations('booking.eligibility');
  const { selectedServiceIds, toggleService, isMaxServicesReached } = useBookingFlow();

  const [openSlugs, setOpenSlugs] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // UX: todas as categorias começam FECHADAS — com a primeira aberta,
    // o cliente podia assumir que só existia essa categoria e não fazer
    // scroll até às restantes. Exceção: deep-link com ?categoria= no URL
    // (ex.: vindo da página de serviços) abre a categoria pedida.
    if (initialOpenSlug) {
      initial.add(initialOpenSlug);
    }
    return initial;
  });

  /** Aviso inline (por serviço) quando o cliente toca num incompatível */
  const [notice, setNotice] = useState<Notice | null>(null);

  // Serviços do carrinho com os dados de elegibilidade (fonte: props,
  // não o snapshot do sessionStorage — o snapshot não guarda staffIds).
  const allServices = categories.flatMap((c) => c.services);
  const cartServices = allServices.filter((s) => selectedServiceIds.includes(s.id));
  const cartHasRestrictions = cartServices.some((s) => s.staffIds.length > 0);

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

  /** Mensagem "«B» é feito por Y, que não realiza «A»…" */
  const buildIncompatibleMessage = (service: ServiceData): string => {
    const serviceStaff = joinNames(getStaffNamesForService(service, staff), t('and'));
    const cartStaff = joinNames(
      staff.filter((s) => getQualifiedStaffIds(cartServices, [s]).length > 0).map((s) => s.name),
      t('and'),
    );
    const cartNames = joinNames(
      cartServices.map((s) => `«${s.name}»`),
      t('and'),
    );
    return t('incompatibleService', {
      service: service.name,
      serviceStaff,
      cart: cartNames,
      cartStaff,
    });
  };

  const handleServiceToggle = (service: ServiceData) => {
    const isSelected = selectedServiceIds.includes(service.id);

    // Adicionar um serviço sem nenhum profissional em comum com o
    // carrinho → NÃO adiciona; explica e sugere marcação separada.
    if (!isSelected && cartServices.length > 0) {
      const compatible = isServiceCompatibleWithCart(service, cartServices, staff);
      if (!compatible) {
        setNotice({ serviceId: service.id, message: buildIncompatibleMessage(service) });
        return;
      }
    }

    setNotice(null);
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
    <div className="space-y-4">
      {categories.map((category) => {
        const isOpen = openSlugs.has(category.slug);
        const selectedInCategory = category.services.filter((s) =>
          selectedServiceIds.includes(s.id),
        ).length;

        return (
          <div
            key={category.id}
            className={cn(
              'border-chi-border bg-chi-cream overflow-hidden rounded-lg border transition-all',
              isOpen ? 'shadow-soft' : 'hover:shadow-soft',
            )}
          >
            {/* CATEGORY HEADER */}
            <button
              onClick={() => toggleCategory(category.slug)}
              className={cn(
                'group flex w-full items-center justify-between gap-4 text-left transition-colors',
                'hover:bg-chi-sand/30',
                isOpen && 'bg-chi-sand/20',
              )}
              style={{ padding: '24px 32px' }}
              aria-expanded={isOpen}
              aria-controls={`category-${category.slug}`}
            >
              <div className="flex min-w-0 items-center gap-4">
                {/* Barra dourada antes do título */}
                <span
                  className={cn(
                    'shrink-0 rounded-full transition-all duration-300',
                    isOpen ? 'bg-chi-gold' : 'bg-chi-gold/30 group-hover:bg-chi-gold/60',
                  )}
                  style={{ width: '3px', height: '32px' }}
                  aria-hidden="true"
                />
                <h3 className="text-chi-charcoal truncate font-serif text-2xl md:text-3xl">
                  {category.name}
                </h3>
                {selectedInCategory > 0 && (
                  <span
                    className="bg-chi-gold text-chi-green-deep shrink-0 rounded-full text-[10px] font-semibold tracking-[0.18em] uppercase"
                    style={{ padding: '4px 12px' }}
                  >
                    {selectedInCategory} selecionado
                    {selectedInCategory > 1 && 's'}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <span className="text-chi-charcoal-light text-[11px] tracking-[0.22em] uppercase">
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

            {/* SERVICES LIST */}
            <div
              id={`category-${category.slug}`}
              className={cn(
                'overflow-hidden transition-all duration-300',
                isOpen ? 'max-h-[2500px]' : 'max-h-0',
              )}
            >
              <ul className="divide-chi-border-light border-chi-border divide-y border-t">
                {category.services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  const isDisabled = !isSelected && isMaxServicesReached;
                  // Só vale a pena calcular quando há restrições no carrinho
                  const isIncompatible =
                    !isSelected &&
                    cartHasRestrictions &&
                    !isServiceCompatibleWithCart(service, cartServices, staff);
                  const showNotice = notice?.serviceId === service.id;

                  return (
                    <li key={service.id}>
                      <button
                        onClick={() => handleServiceToggle(service)}
                        disabled={isDisabled}
                        className={cn(
                          'flex w-full items-center justify-between text-left transition-all',
                          isSelected
                            ? 'bg-chi-sand/60 hover:bg-chi-sand/80'
                            : 'hover:bg-chi-sand/30',
                          isDisabled && 'cursor-not-allowed opacity-50',
                          // Incompatível: visualmente "desativado", mas o clique
                          // continua a funcionar para mostrar a explicação
                          isIncompatible && 'opacity-60',
                        )}
                        style={{
                          padding: '20px 32px',
                          gap: '20px',
                        }}
                        aria-pressed={isSelected}
                        aria-disabled={isIncompatible || undefined}
                        aria-describedby={showNotice ? `notice-${service.id}` : undefined}
                      >
                        {/* Checkbox custom */}
                        <div
                          className={cn(
                            'flex shrink-0 items-center justify-center rounded border-2 transition-all',
                            isSelected
                              ? 'border-chi-gold bg-chi-gold'
                              : 'border-chi-charcoal-light/40 bg-transparent',
                            isIncompatible && 'border-dashed',
                          )}
                          style={{ width: '20px', height: '20px' }}
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

                        {/* Nome + popular badge + duracao */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span
                              className={cn(
                                'font-serif text-base md:text-lg',
                                isSelected ? 'text-chi-green-deep' : 'text-chi-charcoal',
                              )}
                            >
                              {service.name}
                            </span>
                            {service.popular && !isIncompatible && (
                              <span
                                className="text-chi-gold-deep border-chi-gold/40 rounded border text-[9px] font-semibold tracking-[0.2em] uppercase"
                                style={{ padding: '2px 8px' }}
                              >
                                Popular
                              </span>
                            )}
                            {isIncompatible && (
                              <span
                                className="rounded border text-[9px] font-semibold tracking-[0.2em] uppercase"
                                style={{
                                  padding: '2px 8px',
                                  color: '#8A6D3B',
                                  borderColor: 'rgba(138,109,59,0.4)',
                                }}
                              >
                                {t('separateBookingBadge')}
                              </span>
                            )}
                          </div>
                          <span
                            className="text-chi-charcoal-light block text-xs tracking-wide"
                            style={{ marginTop: '6px' }}
                          >
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

                      {/* Aviso inline — colado ao serviço em que o cliente tocou */}
                      {showNotice && (
                        <div
                          id={`notice-${service.id}`}
                          role="alert"
                          className="border-t text-sm leading-relaxed"
                          style={{
                            padding: '14px 32px 18px',
                            backgroundColor: 'rgba(212,175,110,0.10)',
                            borderColor: 'rgba(212,175,110,0.5)',
                            color: '#3D3D3D',
                          }}
                        >
                          <p>{notice?.message}</p>
                          <p className="mt-2 text-xs italic" style={{ color: '#6B6B6B' }}>
                            {t('separateBookingHint')}
                          </p>
                        </div>
                      )}
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
        <p className="text-chi-charcoal-light pt-4 text-center text-sm leading-relaxed italic">
          Atingiu o máximo de 5 serviços por reserva. Para escolher outro, remova um dos
          selecionados.
        </p>
      )}
    </div>
  );
}
