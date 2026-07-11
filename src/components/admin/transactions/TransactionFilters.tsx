// 📄 src/components/admin/transactions/TransactionFilters.tsx
'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

export type TxFilters = {
  search: string;
  status: string;
  method: string;
  category: string;
  from: string;
  to: string;
};

export const EMPTY_TX_FILTERS: TxFilters = {
  search: '',
  status: '',
  method: '',
  category: '',
  from: '',
  to: '',
};

export type TransactionFiltersProps = {
  filters: TxFilters;
  onChange: (patch: Partial<TxFilters>) => void;
  categoryOptions?: { value: string; label: string }[];
  className?: string;
};

export function TransactionFilters({
  filters,
  onChange,
  categoryOptions,
  className,
}: TransactionFiltersProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="text-chi-charcoal-light pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Nº, descrição ou fornecedor…"
            className={cn(
              'border-chi-border text-chi-charcoal h-11 w-full rounded-md border bg-white pr-3 pl-9 text-sm',
              'placeholder:text-chi-charcoal-light focus:border-chi-gold focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
            )}
          />
        </div>
        <Select
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="sm:w-44"
        >
          <option value="">Todos os estados</option>
          <option value="completed">Concluída</option>
          <option value="refunded">Reembolsada</option>
          <option value="pending">Pendente</option>
          <option value="cancelled">Cancelada</option>
        </Select>
        <Select
          value={filters.method}
          onChange={(e) => onChange({ method: e.target.value })}
          className="sm:w-44"
        >
          <option value="">Todos os métodos</option>
          <option value="cash">Numerário</option>
          <option value="card_terminal">Terminal (TPA)</option>
          <option value="mb_way">MB WAY</option>
          <option value="multibanco">Multibanco</option>
          <option value="transfer">Transferência</option>
          <option value="other">Outro</option>
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {categoryOptions && (
          <Select
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="sm:w-56"
          >
            <option value="">Todas as categorias</option>
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
        <div className="flex items-center gap-2">
          <DatePicker
            value={filters.from}
            onChange={(e) => onChange({ from: e.target.value })}
            className="sm:w-40"
            aria-label="De"
          />
          <span className="text-chi-charcoal-light">–</span>
          <DatePicker
            value={filters.to}
            onChange={(e) => onChange({ to: e.target.value })}
            className="sm:w-40"
            aria-label="Até"
          />
        </div>
      </div>
    </div>
  );
}
