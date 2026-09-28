// 📄 src/types/booking.ts
/**
 * Chi Sublime — Tipos de domínio: Marcações
 * ============================================================
 * Re-export dos DTOs de marcações (admin + área de cliente).
 * Evita os *Result unions específicos das actions para não colidir.
 */
export type {
  AdminBookingForList,
  AdminBookingMeta,
  CreateManualBookingInput,
  UpdateStatusInput,
} from '@/lib/server-actions/admin-bookings';
export type { BookingForClient } from '@/lib/server-actions/bookings';
