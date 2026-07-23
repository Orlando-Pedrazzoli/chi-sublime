// 📄 src/components/admin/checkout/InvoiceSection.tsx
'use client';

/**
 * ⚠️ FIX bug Tailwind v4 + Next 16: espaçamentos, caixas e
 * inputs em INLINE STYLE. Lógica e API inalteradas.
 */

import { useEffect, useState } from 'react';
import { Search, X, UserPlus, FileText } from 'lucide-react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Checkbox
        checked={enabled}
        onChange={(e) => onEnabledChange(e.target.checked)}
        label={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 500,
            }}
          >
            <FileText size={15} />
            Emitir fatura
          </span>
        }
      />

      {enabled && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #f1eee6',
            backgroundColor: 'rgba(250,247,242,0.5)',
          }}
        >
          {/* Cliente */}
          {client ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #d4af6e',
                backgroundColor: 'rgba(212,175,110,0.15)',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a' }}>
                {client.name}
              </span>
              <button
                type="button"
                onClick={() => onClientChange(null)}
                aria-label="Remover cliente"
                className="transition-colors hover:bg-white"
                style={{ padding: '4px', borderRadius: '6px', color: '#5a5a5a' }}
              >
                <X size={15} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search
                    size={15}
                    style={{
                      pointerEvents: 'none',
                      position: 'absolute',
                      top: '50%',
                      left: '10px',
                      transform: 'translateY(-50%)',
                      color: '#9a9a9a',
                    }}
                  />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Associar cliente…"
                    className="placeholder:text-chi-charcoal-light focus:ring-chi-gold/40 w-full focus:ring-2 focus:outline-none"
                    style={{
                      height: '40px',
                      padding: '0 12px 0 32px',
                      borderRadius: '8px',
                      border: '1px solid #e8e4da',
                      backgroundColor: '#ffffff',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setQuickOpen(true)}
                  className="hover:bg-chi-sand transition-colors"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '40px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #e8e4da',
                    backgroundColor: '#ffffff',
                    fontSize: '13.5px',
                    color: '#1a1a1a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <UserPlus size={15} />
                  Novo
                </button>
              </div>

              {results.length > 0 && (
                <ul
                  style={{
                    position: 'absolute',
                    zIndex: 10,
                    marginTop: '4px',
                    maxHeight: '208px',
                    width: '100%',
                    overflow: 'auto',
                    borderRadius: '8px',
                    border: '1px solid #e8e4da',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 16px 40px rgba(31, 61, 46, 0.16)',
                  }}
                >
                  {results.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectClient({ id: c.id, name: c.name })}
                        className="hover:bg-chi-sand w-full transition-colors"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '9px 12px',
                          textAlign: 'left',
                          fontSize: '14px',
                        }}
                      >
                        <span style={{ color: '#1a1a1a' }}>{c.name}</span>
                        <span style={{ fontSize: '12px', color: '#9a9a9a' }}>{c.phone}</span>
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
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#9a9a9a' }}>
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
