// 📄 src/components/admin/checkout/InvoiceSection.tsx
'use client';

import { useEffect, useState } from 'react';
import { Search, X, UserPlus, FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/Label';
import { useDebounce } from '@/hooks/useDebounce';
import { listClientsAction } from '@/lib/server-actions/clients';
import type { ClientListItem } from '@/types/client';
import { NifInput } from './NifInput';
import { QuickClientCreate } from './QuickClientCreate';

export type SelectedClient = { id: string; name: string };

export type InvoiceSectionProps = {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  client: SelectedClient | null;
  onClientChange: (c: SelectedClient | null) => void;
  nif: string;
  onNifChange: (v: string) => void;
};

export function InvoiceSection({
  enabled,
  onEnabledChange,
  client,
  onClientChange,
  nif,
  onNifChange,
}: InvoiceSectionProps) {
  const [searchText, setSearchText] = useState('');
  const debounced = useDebounce(searchText, 300);
  const [results, setResults] = useState<ClientListItem[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);

  useEffect(() => {
    if (debounced.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await listClientsAction({ search: debounced, pageSize: 6 });
      if (!cancelled && res.success) setResults(res.data.items);
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const selectClient = (c: SelectedClient) => {
    onClientChange(c);
    setSearchText('');
    setResults([]);
  };

  return (
    <div className="space-y-3">
      <Checkbox
        checked={enabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
        label={
          <span className="inline-flex items-center gap-1.5 font-medium">
            <FileText size={15} />
            Emitir fatura
          </span>
        }
      />

      {enabled && (
        <div className="border-chi-border-light bg-chi-cream/40 space-y-3 rounded-md border p-3">
          {/* Cliente */}
          {client ? (
            <div className="border-chi-gold bg-chi-gold-soft/30 flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-chi-charcoal text-sm font-medium">{client.name}</span>
              <button
                type="button"
                onClick={() => onClientChange(null)}
                aria-label="Remover cliente"
                className="text-chi-charcoal-soft hover:text-chi-charcoal rounded-md p-1 transition-colors hover:bg-white"
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={15}
                    className="text-chi-charcoal-light pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Associar cliente…"
                    className={cn(
                      'border-chi-border h-10 w-full rounded-md border bg-white pr-3 pl-8 text-sm',
                      'placeholder:text-chi-charcoal-light focus:border-chi-gold focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQuickOpen(true)}
                  className="border-chi-border text-chi-charcoal hover:bg-chi-sand inline-flex h-10 items-center gap-1.5 rounded-md border bg-white px-3 text-sm transition-colors"
                >
                  <UserPlus size={15} />
                  Novo
                </button>
              </div>

              {results.length > 0 && (
                <ul className="border-chi-border shadow-strong absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-md border bg-white">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectClient({ id: c.id, name: c.name })}
                        className="hover:bg-chi-sand flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors"
                      >
                        <span className="text-chi-charcoal">{c.name}</span>
                        <span className="text-chi-charcoal-light text-xs">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* NIF */}
          <div>
            <Label>NIF na fatura</Label>
            <NifInput value={nif} onChange={onNifChange} />
            <p className="text-chi-charcoal-light mt-1 text-xs">
              {client
                ? 'Se o cliente tiver NIF, é usado automaticamente. Preenche aqui para sobrepor.'
                : 'Sem NIF, a fatura sai como Consumidor Final.'}
            </p>
          </div>
        </div>
      )}

      <QuickClientCreate
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onCreated={(c) => selectClient(c)}
        initialName={searchText}
      />
    </div>
  );
}
