// 📄 src/components/admin/checkout/CheckoutModal.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils/cn';
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

export type CheckoutModalProps = {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
};

export function CheckoutModal({ open, onClose, onCompleted }: CheckoutModalProps) {
  const toast = useToast();

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
        <div className="flex h-64 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Grelha de serviços */}
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 lg:max-h-[70vh]">
            {grouped.length === 0 ? (
              <p className="text-chi-charcoal-light py-8 text-center text-sm">
                Sem serviços ativos. Cria serviços em Serviços.
              </p>
            ) : (
              grouped.map(([category, items]) => (
                <div key={category}>
                  <p className="text-chi-charcoal-soft mb-2 text-xs font-medium tracking-wide uppercase">
                    {category}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {items.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => addService(s)}
                        className={cn(
                          'border-chi-border flex min-h-[64px] flex-col justify-between rounded-md border bg-white p-2.5 text-left transition-colors',
                          'hover:border-chi-gold hover:bg-chi-sand active:scale-[0.98]',
                        )}
                      >
                        <span className="text-chi-charcoal line-clamp-2 text-sm font-medium">
                          {s.name.pt}
                        </span>
                        <span className="text-chi-charcoal-soft text-xs">
                          {money(s.priceWithVat)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Carrinho + checkout */}
          <div className="border-chi-border bg-chi-cream/30 flex flex-col gap-4 rounded-lg border p-4">
            <div className="text-chi-green-deep flex items-center gap-2">
              <ShoppingCart size={16} />
              <span className="text-sm font-medium">Venda</span>
            </div>

            <div className="max-h-[28vh] overflow-y-auto">
              <ServiceLines
                lines={lines}
                onQuantity={setQuantity}
                onDiscount={setDiscount}
                onRemove={removeLine}
              />
            </div>

            {/* Totais */}
            <div className="border-chi-border-light space-y-1.5 border-t pt-3 text-sm">
              <div className="text-chi-charcoal-soft flex justify-between">
                <span>Líquido</span>
                <span>{money(net)}</span>
              </div>
              <div className="text-chi-charcoal-soft flex justify-between">
                <span>IVA ({vatRate}%)</span>
                <span>{money(vat)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-chi-charcoal-soft">Gorjeta (€)</span>
                <input
                  inputMode="decimal"
                  value={tip}
                  onChange={(e) => setTip(e.target.value)}
                  placeholder="0,00"
                  className="border-chi-border focus:border-chi-gold focus:ring-chi-gold/40 h-8 w-20 rounded-md border bg-white px-2 text-right text-sm focus:ring-2 focus:outline-none"
                />
              </div>
              <div className="border-chi-border-light text-chi-green-deep flex justify-between border-t pt-2 text-base font-semibold">
                <span>Total</span>
                <span>{money(total)}</span>
              </div>
            </div>

            {/* Categoria + profissional */}
            <div className="grid grid-cols-1 gap-2">
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
              <Select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">Sem profissional</option>
                {staff.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>

            <PaymentMethodPicker value={paymentMethod} onChange={setPaymentMethod} />

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
              className="w-full justify-center py-3 text-base"
            >
              Cobrar {money(total)}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
