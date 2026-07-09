// 📄 src/types/client.ts
/**
 * Chi Sublime — Tipos de domínio: Cliente
 * ============================================================
 * Re-export dos DTOs co-localizados na server action de clientes.
 * Superfície de importação limpa para forms e UI: `@/types/client`.
 * (Re-export só-de-tipos → apagado em compile, sem runtime.)
 */
export type { ClientListItem, ClientDetail, ClientFiscal } from '@/lib/server-actions/clients';
