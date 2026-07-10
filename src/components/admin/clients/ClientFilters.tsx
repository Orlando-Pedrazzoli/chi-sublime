// 📄 src/components/admin/clients/ClientFilters.tsx
'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Select } from '@/components/ui/Select';

export type ClientStatusFilter = 'all' | 'active' | 'blocked';
export type ClientSort = 'recent' | 'name' | 'totalSpent' | 'visits';

export type ClientFiltersProps = {
  search: string;
  onSearch: (value: string) => void;
  status: ClientStatusFilter;
  onStatus: (value: ClientStatusFilter) => void;
  sort: ClientSort;
  onSort: (value: ClientSort) => void;
  className?: string;
};

export function ClientFilters({
  search,
  onSearch,
  status,
  onStatus,
  sort,
  onSort,
  className,
}: ClientFiltersProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="relative flex-1">
        <Search
          size={16}
          className="text-chi-charcoal-light pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Pesquisar por nome, telefone ou email…"
          className={cn(
            'border-chi-border text-chi-charcoal h-11 w-full rounded-md border bg-white pr-3 pl-9 text-sm transition-colors',
            'placeholder:text-chi-charcoal-light focus:border-chi-gold focus:ring-chi-gold/40 focus:ring-2 focus:outline-none',
          )}
        />
      </div>

      <Select
        value={status}
        onChange={(e) => onStatus(e.target.value as ClientStatusFilter)}
        className="sm:w-44"
      >
        <option value="all">Todos</option>
        <option value="active">Ativos</option>
        <option value="blocked">Bloqueados</option>
      </Select>

      <Select
        value={sort}
        onChange={(e) => onSort(e.target.value as ClientSort)}
        className="sm:w-48"
      >
        <option value="recent">Mais recentes</option>
        <option value="name">Nome (A–Z)</option>
        <option value="totalSpent">Maior gasto</option>
        <option value="visits">Mais visitas</option>
      </Select>
    </div>
  );
}
