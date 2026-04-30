'use client';

/**
 * Chi Sublime — Step 3 Client (Form de confirmação)
 *
 * REQUER LOGIN. Se não autenticado, mostra gate de login/registo.
 * Se admin, bloqueia (admin não faz reservas pessoais).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { User, LogIn, UserPlus } from 'lucide-react';
import { useBookingFlow } from '@/hooks/useBookingFlow';
import { createBookingAction } from '@/lib/server-actions/bookings';
import { cn } from '@/lib/utils/cn';

type FormErrors = Record<string, string>;

type FormState = {
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
  const { data: session, status } = useSession();
  const { selectedServiceIds, staffId, date, time } = useBookingFlow();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ============================================================
  // Estado: a verificar sessão
  // ============================================================
  if (status === 'loading') {
    return <SessionLoadingState />;
  }

  // ============================================================
  // Estado: NÃO logado → gate de auth
  // ============================================================
  if (!session?.user) {
    return <AuthGate />;
  }

  // ============================================================
  // Estado: logado como ADMIN → bloquear
  // ============================================================
  if (session.user.role === 'admin') {
    return <AdminBlockedState />;
  }

  // ============================================================
  // Estado: logado como CLIENTE → form de confirmação
  // ============================================================

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
          name: session.user.name,
          email: session.user.email,
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
        // TODO (próxima fase): passar userId/clientId para vincular ao User
        // userId: session.user.id,
        // clientId: session.user.clientId,
      };

      const result = await createBookingAction(input);

      if (result.success) {
        // Hard navigation para escapar do BookingFlowGuard
        window.location.href = `/reservar/${result.booking.bookingNumber}`;
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
      {/* Sessão activa — confirmação visual de quem está a reservar */}
      <SessionBanner name={session.user.name} email={session.user.email} />

      <div>
        <h3 className="text-chi-charcoal mb-2 font-serif text-2xl">Confirmar dados</h3>
        <p className="text-chi-charcoal-soft mb-6 text-sm">
          Confirma o teu telefone e adiciona notas se necessário.
        </p>

        <div className="space-y-5">
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

      {/* Faturação com NIF */}
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

      {/* Política e marketing */}
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

      {/* Honeypot */}
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

      {/* Erro de submit */}
      {submitError && (
        <div className="border-chi-danger/30 bg-chi-danger-bg rounded-md border p-4">
          <p className="text-chi-danger text-sm font-medium">{submitError}</p>
        </div>
      )}

      {/* Botões */}
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
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-6 py-3.5 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-60"
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
        Os teus dados são tratados com confidencialidade e usados apenas para gerir a tua reserva.
      </p>
    </form>
  );
}

// ============================================================
// SUBCOMPONENTES — Estados auxiliares
// ============================================================

function SessionLoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <span
        className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: '#1F3D2E', borderTopColor: 'transparent' }}
      />
      <p className="text-chi-charcoal-soft text-sm">A verificar sessão...</p>
    </div>
  );
}

function AuthGate() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="mb-3 text-[10px] tracking-[0.3em] uppercase" style={{ color: '#B8924A' }}>
          Quase lá
        </p>
        <h3 className="text-chi-charcoal mb-3 font-serif text-3xl">Falta apenas um passo</h3>
        <p className="text-chi-charcoal-soft mx-auto max-w-md text-sm">
          Para confirmar a tua reserva, entra na tua conta ou cria uma agora. Vai demorar menos de
          um minuto e poderás gerir todas as tuas reservas num só lugar.
        </p>
      </div>

      <div
        className="mx-auto h-px w-12"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(212,175,110,0.6), transparent)',
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/entrar?redirect=/reservar/confirmar"
          className="group flex flex-1 items-center justify-center gap-2 rounded-md px-6 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
          style={{
            backgroundColor: '#1F3D2E',
            color: '#FAF7F2',
          }}
        >
          <LogIn size={14} strokeWidth={1.5} />
          Já tenho conta
        </Link>

        <Link
          href="/registar?redirect=/reservar/confirmar"
          className="group flex flex-1 items-center justify-center gap-2 rounded-md border-2 px-6 py-4 text-xs font-semibold tracking-[0.22em] uppercase transition-all hover:-translate-y-[1px]"
          style={{
            borderColor: '#1F3D2E',
            color: '#1F3D2E',
            backgroundColor: 'transparent',
          }}
        >
          <UserPlus size={14} strokeWidth={1.5} />
          Criar conta
        </Link>
      </div>

      <div
        className="rounded-md p-4 text-center text-xs italic"
        style={{
          backgroundColor: 'rgba(212,175,110,0.08)',
          color: '#5A5A5A',
        }}
      >
        Os teus dados de reserva ficam guardados durante este processo.
      </div>
    </div>
  );
}

function AdminBlockedState() {
  return (
    <div className="space-y-4 py-12 text-center">
      <h3 className="text-chi-charcoal font-serif text-2xl">Conta administrativa</h3>
      <p className="text-chi-charcoal-soft mx-auto max-w-md text-sm">
        Estás autenticado como administrador. As reservas online destinam-se a clientes. Para criar
        uma reserva no balcão, usa o módulo de Receitas / Caixa no painel administrativo.
      </p>
      <Link
        href="/admin/dashboard"
        className="inline-block rounded-md px-6 py-3 text-xs font-semibold tracking-[0.22em] uppercase"
        style={{ backgroundColor: '#1F3D2E', color: '#FAF7F2' }}
      >
        Ir para o painel
      </Link>
    </div>
  );
}

function SessionBanner({ name, email }: { name: string; email: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-md border p-4"
      style={{
        backgroundColor: 'rgba(151,196,89,0.08)',
        borderColor: 'rgba(151,196,89,0.3)',
      }}
    >
      <div
        className="flex h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(31,61,46,0.1)' }}
      >
        <User size={18} strokeWidth={1.5} style={{ color: '#1F3D2E' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.22em] uppercase" style={{ color: '#5A5A5A' }}>
          A reservar como
        </p>
        <p className="truncate text-sm font-medium" style={{ color: '#1F3D2E' }}>
          {name} <span className="text-chi-charcoal-light font-normal">· {email}</span>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// FormField + helpers (mantido do original)
// ============================================================

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
