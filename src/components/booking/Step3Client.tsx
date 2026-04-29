'use client';

/**
 * Chi Sublime — Step 3 Client (Form de confirmacao)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { createBookingAction } from '@/lib/server-actions/bookings';
import { cn } from '@/lib/utils/cn';

type FormErrors = Record<string, string>;

type FormState = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  requestInvoice: boolean;
  vatNumber: string;
  fullLegalName: string;
  address: string;
  postalCode: string;
  city: string;
  acceptsCancellationPolicy: boolean;
  marketingConsent: boolean;
  website: string;
};

const INITIAL_FORM: FormState = {
  name: '',
  email: '',
  phone: '',
  notes: '',
  requestInvoice: false,
  vatNumber: '',
  fullLegalName: '',
  address: '',
  postalCode: '',
  city: '',
  acceptsCancellationPolicy: false,
  marketingConsent: false,
  website: '',
};

export function Step3Client() {
  const router = useRouter();
  const { selectedServiceIds, staffId, date, time, clearFlow } = useBookingFlow();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as string];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setErrors({});

    if (!date || !time || !staffId) {
      setSubmitError('Falta informação da reserva. Volte ao passo anterior.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input = {
        serviceIds: selectedServiceIds,
        staffId,
        date,
        time,
        guestInfo: {
          name: form.name,
          email: form.email,
          phone: form.phone,
        },
        notes: form.notes || undefined,
        requestInvoice: form.requestInvoice,
        fiscalData: form.requestInvoice
          ? {
              vatNumber: form.vatNumber || undefined,
              fullLegalName: form.fullLegalName || undefined,
              address: form.address || undefined,
              postalCode: form.postalCode || undefined,
              city: form.city || undefined,
              country: 'PT',
            }
          : undefined,
        acceptsCancellationPolicy: form.acceptsCancellationPolicy,
        marketingConsent: form.marketingConsent,
        website: form.website,
        source: 'website' as const,
      };

      const result = await createBookingAction(input);

      if (result.success) {
        // Marca como redirecting ANTES de qualquer outra coisa
        // (impede o BookingFlowGuard de reagir)
        setIsRedirecting(true);

        // Usa hard navigation para escapar definitivamente do Guard
        // (window.location é síncrono e não está sujeito ao React state)
        window.location.href = `/reservar/${result.booking.bookingNumber}`;

        // clearFlow só corre depois do navigate (na nova página)
        // Não chamamos aqui porque a página vai recarregar
        return;
      } else {
        if (result.error.fieldErrors) {
          const flatErrors: FormErrors = {};
          for (const [path, msgs] of Object.entries(result.error.fieldErrors)) {
            flatErrors[path] = msgs[0] ?? 'Inválido';
          }
          setErrors(flatErrors);
        }
        setSubmitError(result.error.message);

        if (result.error.code === 'slot-taken') {
          setSubmitError('Este horário já não está disponível. Por favor escolha outro.');
        }
      }
    } catch (err) {
      console.error('Submit failed:', err);
      setSubmitError('Erro ao processar reserva. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <div>
        <h3 className="text-chi-charcoal mb-2 font-serif text-2xl">Os seus dados</h3>
        <p className="text-chi-charcoal-soft mb-6 text-sm">
          Para confirmarmos a sua reserva e enviarmos os detalhes por email.
        </p>

        <div className="space-y-5">
          <FormField label="Nome completo" htmlFor="name" error={errors['guestInfo.name']} required>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Maria Silva"
              autoComplete="name"
              required
              className={inputClass(errors['guestInfo.name'])}
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="email"
            error={errors['guestInfo.email']}
            required
            helper="Vai receber confirmação neste email"
          >
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="maria@example.com"
              autoComplete="email"
              required
              className={inputClass(errors['guestInfo.email'])}
            />
          </FormField>

          <FormField
            label="Telefone"
            htmlFor="phone"
            error={errors['guestInfo.phone']}
            required
            helper="Formato português (+351 ou 9 dígitos)"
          >
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="+351 912 345 678"
              autoComplete="tel"
              required
              className={inputClass(errors['guestInfo.phone'])}
            />
          </FormField>

          <FormField
            label="Notas (opcional)"
            htmlFor="notes"
            helper="Alergias, preferências, ou qualquer detalhe importante"
          >
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              maxLength={1000}
              className={cn(inputClass(), 'resize-none')}
            />
          </FormField>
        </div>
      </div>

      <div className="border-chi-border border-t pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.requestInvoice}
            onChange={(e) => updateField('requestInvoice', e.target.checked)}
            className="accent-chi-gold mt-1 h-5 w-5 cursor-pointer rounded"
          />
          <div className="flex-1">
            <span className="text-chi-charcoal font-medium">Quero receber fatura com NIF</span>
            <p className="text-chi-charcoal-light mt-0.5 text-xs">
              Para faturação empresarial ou recibo médico.
            </p>
          </div>
        </label>

        {form.requestInvoice && (
          <div className="border-chi-gold/30 mt-5 space-y-5 border-l-2 pl-8">
            <FormField
              label="NIF"
              htmlFor="vatNumber"
              error={errors['fiscalData.vatNumber']}
              required
            >
              <input
                id="vatNumber"
                type="text"
                inputMode="numeric"
                value={form.vatNumber}
                onChange={(e) => updateField('vatNumber', e.target.value)}
                placeholder="123456789"
                maxLength={9}
                className={inputClass(errors['fiscalData.vatNumber'])}
              />
            </FormField>

            <FormField
              label="Nome ou razão social"
              htmlFor="fullLegalName"
              helper="Como aparece na fatura"
            >
              <input
                id="fullLegalName"
                type="text"
                value={form.fullLegalName}
                onChange={(e) => updateField('fullLegalName', e.target.value)}
                placeholder="Maria Silva ou Empresa Lda"
                className={inputClass()}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr]">
              <FormField label="Morada" htmlFor="address">
                <input
                  id="address"
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Rua Principal, 12"
                  className={inputClass()}
                />
              </FormField>

              <FormField label="Código postal" htmlFor="postalCode">
                <input
                  id="postalCode"
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => updateField('postalCode', e.target.value)}
                  placeholder="1234-567"
                  className={inputClass()}
                />
              </FormField>
            </div>

            <FormField label="Cidade" htmlFor="city">
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Cascais"
                className={inputClass()}
              />
            </FormField>
          </div>
        )}
      </div>

      <div className="border-chi-border space-y-4 border-t pt-6">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.acceptsCancellationPolicy}
            onChange={(e) => updateField('acceptsCancellationPolicy', e.target.checked)}
            required
            className="accent-chi-gold mt-1 h-5 w-5 cursor-pointer rounded"
          />
          <div className="flex-1">
            <span className="text-chi-charcoal text-sm">
              Aceito a{' '}
              <Link
                href="/cancelamento"
                target="_blank"
                rel="noopener"
                className="text-chi-gold-deep hover:text-chi-green-deep underline"
              >
                política de cancelamento
              </Link>
              <span className="text-chi-danger ml-1">*</span>
            </span>
            <p className="text-chi-charcoal-light mt-0.5 text-xs">
              Cancelamentos devem ser feitos com pelo menos 24h de antecedência.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={form.marketingConsent}
            onChange={(e) => updateField('marketingConsent', e.target.checked)}
            className="accent-chi-gold mt-1 h-5 w-5 cursor-pointer rounded"
          />
          <div className="flex-1">
            <span className="text-chi-charcoal text-sm">
              Aceito receber comunicações promocionais
            </span>
            <p className="text-chi-charcoal-light mt-0.5 text-xs">
              Promoções, novos serviços, eventos. Pode cancelar a qualquer momento.
            </p>
          </div>
        </label>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[9999px] -left-[9999px] opacity-0"
      >
        <label htmlFor="website">Website (deixar vazio)</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => updateField('website', e.target.value)}
        />
      </div>

      {submitError && (
        <div className="border-chi-danger/30 bg-chi-danger-bg rounded-md border p-4">
          <p className="text-chi-danger text-sm font-medium">{submitError}</p>
        </div>
      )}

      <div className="border-chi-border flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:gap-4">
        <button
          type="button"
          onClick={() => router.push('/reservar/horario')}
          disabled={isSubmitting}
          className="border-chi-border text-chi-charcoal-soft hover:bg-chi-sand/40 hover:text-chi-charcoal inline-flex items-center justify-center gap-2 rounded-md border px-6 py-3.5 text-xs font-medium tracking-[0.22em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
        >
          <span>←</span>
          Voltar
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex flex-1 items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
          style={{
            backgroundColor: '#1F3D2E',
            color: '#FAF7F2',
          }}
        >
          {isSubmitting ? (
            <>
              <span
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: '#FAF7F2',
                  borderTopColor: 'transparent',
                }}
              />
              A processar...
            </>
          ) : (
            <>Confirmar Reserva →</>
          )}
        </button>
      </div>

      <p className="text-chi-charcoal-light text-center text-xs italic">
        Os seus dados são tratados com confidencialidade e usados apenas para gerir a sua reserva.
      </p>
    </form>
  );
}

function FormField({
  label,
  htmlFor,
  children,
  error,
  helper,
  required,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string;
  helper?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-chi-charcoal mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-chi-danger ml-1">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-chi-danger mt-1.5 text-xs font-medium">{error}</p>
      ) : helper ? (
        <p className="text-chi-charcoal-light mt-1.5 text-xs italic">{helper}</p>
      ) : null}
    </div>
  );
}

function inputClass(error?: string): string {
  return cn(
    'w-full rounded-md border bg-chi-cream px-4 py-3 text-base text-chi-charcoal placeholder:text-chi-charcoal-light/60 transition-colors focus:outline-none focus:ring-2 focus:ring-chi-gold/40',
    error ? 'border-chi-danger focus:border-chi-danger' : 'border-chi-border focus:border-chi-gold',
  );
}
