// 📄 src/components/admin/checkout/CheckoutModal.tsx
'use client';

/**
 * Chi Sublime — CheckoutModal (POS de balcão)
 * ============================================================
 *
 * Redesenho UX/UI:
 * - Duas colunas no desktop: grelha de serviços à esquerda,
 *   carrinho fixo à direita (padrão POS)
 * - Cabeçalhos de categoria fixos (sticky) durante o scroll
 * - Tiles de serviço com alvo tátil generoso e preço destacado
 * - Contador de itens no carrinho; labels nos selects;
 *   secção "Pagamento" identificada
 *
 * ⚠️ Layout crítico (grid, gaps, paddings, cores) em INLINE
 * STYLE — bug Tailwind v4 + Next 16. Breakpoint desktop via
 * matchMedia (inline styles não suportam media queries).
 *
 * Lógica de negócio 100% inalterada.
 */

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { eurosToCents } from '@/lib/utils/cents';
import { cleanNIF, isValidNIF } from '@/lib/utils/nif';
import { listServicesAction } from '@/lib/server-actions/services';
import { listIncomeCategoriesAction, createIncomeAction } from '@/lib/server-actions/transactions';
import { listStaffAction } from '@/lib/server-actions/staff';
import { issueInvoiceAction, retryInvoiceAction } from '@/lib/invoicing/issueInvoiceAction';
import type { ServiceListItem } from '@/types/service';
import type { FinanceCategoryItem } from '@/types/transaction';
import type { StaffListItem } from '@/types/staff';
import { ServiceLines, lineNet, type CartLine } from './ServiceLines';
import { PaymentMethodPicker, type PaymentMethod } from './PaymentMethodPicker';
import { InvoiceSection, type SelectedClient } from './InvoiceSection';

function money(cents: number): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}
function parseEuros(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Breakpoint lg via matchMedia (inline styles não têm media queries). */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

/** Micro-label de secção do painel de venda. */
function MiniLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        marginBottom: '6px',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#5a5a5a',
      }}
    >
      {children}
    </p>
  );
}

export type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
};

export function CheckoutModal({ open, onClose, onCompleted }: CheckoutModalProps) {
  const toast = useToast();
  const isDesktop = useIsDesktop();

  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceListItem[]>([]);
  const [categories, setCategories] = useState<FinanceCategoryItem[]>([]);
  const [staff, setStaff] = useState<StaffListItem[]>([]);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [tip, setTip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [incomeCategoryId, setIncomeCategoryId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [invoiceEnabled, setInvoiceEnabled] = useState(false);
  const [invoiceClient, setInvoiceClient] = useState<SelectedClient | null>(null);
  const [nif, setNif] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Carregar dados + reset ao abrir
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setLines([]);
    setTip('');
    setPaymentMethod('cash');
    setStaffId('');
    setInvoiceEnabled(false);
    setInvoiceClient(null);
    setNif('');
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    (async () => {
      const [svc, cats, team] = await Promise.all([
        listServicesAction({ pageSize: 100, active: true }),
        listIncomeCategoriesAction(),
        listStaffAction({ pageSize: 100, active: true }),
      ]);
      if (svc.success) setServices(svc.data.items);
      if (cats.success) {
        setCategories(cats.data);
        const def = cats.data.find((c) => c.isDefault) ?? cats.data[0];
        setIncomeCategoryId(def?.id ?? '');
      }
      if (team.success) setStaff(team.data.items);
      setLoading(false);
    })();
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceListItem[]>();
    for (const s of services) {
      const key = s.categoryName ?? 'Outros';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [services]);

  const vatRate = lines[0]?.vatRate ?? 23;
  const net = useMemo(() => lines.reduce((sum, l) => sum + lineNet(l), 0), [lines]);
  const vat = Math.round((net * vatRate) / 100);
  const tipCents = eurosToCents(parseEuros(tip));
  const total = net + vat + tipCents;
  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  const addService = (s: ServiceListItem) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.serviceId === s.id);
      if (existing) {
        return prev.map((l) =>
          l.serviceId === s.id ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
        );
      }
      return [
        ...prev,
        {
          serviceId: s.id,
          name: s.name.pt,
          price: s.price,
          quantity: 1,
          discount: 0,
          vatRate: s.vatRate,
        },
      ];
    });
  };

  const setQuantity = (id: string, q: number) =>
    setLines((prev) => prev.map((l) => (l.serviceId === id ? { ...l, quantity: q } : l)));
  const setDiscount = (id: string, d: number) =>
    setLines((prev) => prev.map((l) => (l.serviceId === id ? { ...l, discount: d } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.serviceId !== id));

  const charge = async () => {
    if (lines.length === 0 || !incomeCategoryId) return;
    setSubmitting(true);

    const res = await createIncomeAction({
      incomeCategoryId,
      clientId: invoiceClient?.id || undefined,
      staffId: staffId || undefined,
      services: lines.map((l) => ({
        serviceId: l.serviceId,
        name: l.name,
        price: l.price,
        quantity: l.quantity,
        discount: l.discount,
      })),
      vatRate,
      tipAmount: tipCents,
      paymentMethod,
      invoiceRequested: invoiceEnabled,
    });

    if (!res.success) {
      setSubmitting(false);
      toast.error(res.error.message);
      return;
    }

    const txId = res.data.id;

    if (invoiceEnabled) {
      const cleaned = cleanNIF(nif);
      const validNif = cleaned.length === 9 && isValidNIF(cleaned);
      const inv = validNif
        ? await issueInvoiceAction({
            transactionId: txId,
            documentType: 'FR',
            customer: {
              name: invoiceClient?.name || 'Consumidor Final',
              vatNumber: cleaned,
              country: 'PT',
            },
            sendEmail: true,
          })
        : await retryInvoiceAction({ transactionId: txId });

      if (inv.success) toast.success(`Venda registada · Fatura ${inv.data.documentNumber}`);
      else toast.warning('Venda registada. Fatura ficou pendente — podes reemitir depois.');
    } else {
      toast.success('Venda registada');
    }

    setSubmitting(false);
    onCompleted();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova venda" size="xl" dismissable={!submitting}>
      {loading ? (
        <div
          style={{ height: '256px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Spinner />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) 380px' : '1fr',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* ── Grelha de serviços ─────────────────────────── */}
          <div
            style={{
              maxHeight: isDesktop ? '70vh' : '38vh',
              overflowY: 'auto',
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            {grouped.length === 0 ? (
              <p
                style={{
                  padding: '32px 0',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#9a9a9a',
                }}
              >
                Sem serviços ativos. Cria serviços em Serviços.
              </p>
            ) : (
              grouped.map(([category, items]) => (
                <div key={category}>
                  {/* Cabeçalho fixo da categoria durante o scroll */}
                  <p
                    style={{
                      position: 'sticky',
                      top: 0,
                      zIndex: 1,
                      padding: '2px 0 8px',
                      backgroundColor: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: '#b8924a',
                    }}
                  >
                    {category}
                  </p>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '8px',
                    }}
                  >
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addService(s)}
                        className="hover:border-chi-gold hover:bg-chi-sand transition-colors active:scale-[0.98]"
                        style={{
                          minHeight: '68px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e8e4da',
                          backgroundColor: '#ffffff',
                          textAlign: 'left',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <span
                          className="line-clamp-2"
                          style={{ fontSize: '13.5px', fontWeight: 500, color: '#1a1a1a' }}
                        >
                          {s.name.pt}
                        </span>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#b8924a' }}>
                          {money(s.priceWithVat)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── Carrinho + checkout ────────────────────────── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e8e4da',
              backgroundColor: 'rgba(250,247,242,0.5)',
            }}
          >
            {/* Header do carrinho com contador */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1f3d2e' }}>
              <ShoppingCart size={16} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>Venda</span>
              {itemCount > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: '#1f3d2e',
                    color: '#faf7f2',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            <div style={{ maxHeight: '26vh', overflowY: 'auto' }}>
              <ServiceLines
                lines={lines}
                onQuantity={setQuantity}
                onDiscount={setDiscount}
                onRemove={removeLine}
              />
            </div>

            {/* Totais */}
            <div style={{ borderTop: '1px solid #f1eee6', paddingTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: '#5a5a5a',
                }}
              >
                <span>Líquido</span>
                <span className="tabular-nums">{money(net)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  fontSize: '14px',
                  color: '#5a5a5a',
                }}
              >
                <span>IVA ({vatRate}%)</span>
                <span className="tabular-nums">{money(vat)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  marginBottom: '8px',
                  fontSize: '14px',
                  color: '#5a5a5a',
                }}
              >
                <span>Gorjeta (€)</span>
                <input
                  inputMode="decimal"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0,00"
                  className="focus:ring-chi-gold/40 focus:ring-2 focus:outline-none"
                  style={{
                    height: '34px',
                    width: '84px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #e8e4da',
                    backgroundColor: '#ffffff',
                    textAlign: 'right',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #f1eee6',
                  paddingTop: '10px',
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#1f3d2e',
                }}
              >
                <span>Total</span>
                <span className="tabular-nums">{money(total)}</span>
              </div>
            </div>

            {/* Categoria + profissional, com labels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <MiniLabel>Categoria</MiniLabel>
                <Select
                  value={incomeCategoryId}
                  onChange={(e) => setIncomeCategoryId(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <MiniLabel>Profissional</MiniLabel>
                <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                  <option value="">Sem profissional</option>
                  {staff.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Pagamento */}
            <div>
              <MiniLabel>Pagamento</MiniLabel>
              <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />
            </div>

            <InvoiceSection
              enabled={invoiceEnabled}
              onEnabledChange={setInvoiceEnabled}
              client={invoiceClient}
              onClientChange={setInvoiceClient}
              nif={nif}
              onNifChange={setNif}
            />

            <Button
              onClick={charge}
              loading={submitting}
              disabled={lines.length === 0}
              size="lg"
              fullWidth
            >
              Cobrar {money(total)}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}