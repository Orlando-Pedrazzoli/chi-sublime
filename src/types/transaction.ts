// 📄 src/types/transaction.ts
/**
 * Chi Sublime — Tipos de domínio: Transações e Caixa
 * ============================================================
 * Re-export dos DTOs co-localizados nas server actions financeiras.
 */
export type {
  TransactionListItem,
  TransactionDetail,
  TransactionServiceLine,
  FinanceCategoryItem,
} from '@/lib/server-actions/transactions';
export type {
  CashRegisterDTO,
  CashRegisterListItem,
  PaymentBreakdown,
} from '@/lib/server-actions/cash-register';
