/**
 * Chi Sublime — Models index
 * ============================================================
 *
 * Export central de todos os modelos Mongoose.
 *
 * Uso:
 *   import { Service, Booking, Transaction } from "@/lib/models";
 *
 * Inclui também os tipos TypeScript e helpers de cada modelo.
 */

// ─── Counter (numeração sequencial) ─────────────────────────
export {
  Counter,
  getNextNumber,
  generateBookingNumber,
  generateTransactionNumber,
  type ICounter,
} from './Counter';

// ─── Category (categorias de serviço) ───────────────────────
export { Category, slugify, type ICategory } from './Category';

// ─── Service ────────────────────────────────────────────────
export { Service, type IService } from './Service';

// ─── Staff ──────────────────────────────────────────────────
export {
  Staff,
  WEEKDAYS,
  type IStaff,
  type WeekDay,
  type WorkBreak,
  type WorkDayConfig,
  type VacationPeriod,
} from './Staff';

// ─── User (autenticação web) ────────────────────────────────
export { User, USER_ROLES, type IUser, type UserRole } from './User';

// ─── Client (clientes do salão) ─────────────────────────────
export { Client, CLIENT_SOURCES, type IClient, type ClientSource, type FiscalData } from './Client';

// ─── ClientServiceHistory ──────────────────────────────────
export { ClientServiceHistory, type IClientServiceHistory } from './ClientServiceHistory';

// ─── Booking ────────────────────────────────────────────────
export {
  Booking,
  BOOKING_STATUSES,
  BOOKING_SOURCES,
  type IBooking,
  type BookingStatus,
  type BookingSource,
  type BookingServiceItem,
  type GuestInfo,
  type RemindersState,
} from './Booking';

// ─── IncomeCategory ────────────────────────────────────────
export { IncomeCategory, type IIncomeCategory } from './IncomeCategory';

// ─── ExpenseCategory ───────────────────────────────────────
export { ExpenseCategory, type IExpenseCategory } from './ExpenseCategory';

// ─── Transaction ───────────────────────────────────────────
export {
  Transaction,
  PAYMENT_METHODS,
  type ITransaction,
  type TransactionType,
  type TransactionStatus,
  type PaymentMethod,
  type DocumentType,
  type InvoiceProviderId,
  type TransactionServiceItem,
  type CustomerSnapshot,
  type InvoiceData,
  type RecurringConfig,
  type InvoiceError,
} from './Transaction';

// ─── CashRegister ──────────────────────────────────────────
export { CashRegister, type ICashRegister, type PaymentMethodBreakdown } from './CashRegister';

// ─── Schedule ──────────────────────────────────────────────
export {
  Schedule,
  SCHEDULE_TYPES,
  type ISchedule,
  type ScheduleType,
  type ScheduleBreak,
} from './Schedule';

// ─── SiteContent ───────────────────────────────────────────
export {
  SiteContent,
  CONTENT_TYPES,
  getSiteContent,
  getSiteContents,
  type ISiteContent,
  type ContentType,
} from './SiteContent';

// ─── FiscalSettings ────────────────────────────────────────
export {
  FiscalSettings,
  getFiscalSettings,
  getFiscalSettingsWithTokens,
  type IFiscalSettings,
  type MoloniConfig,
} from './FiscalSettings';

// ─── AuditLog ──────────────────────────────────────────────
export {
  AuditLog,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
  logAudit,
  type IAuditLog,
  type AuditAction,
  type AuditResource,
  type AuditSeverity,
  type AuditChanges,
} from './AuditLog';
