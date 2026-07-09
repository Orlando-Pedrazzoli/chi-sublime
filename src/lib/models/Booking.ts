import mongoose, { Schema, model, models, type Model } from 'mongoose';
import { BOOKING_RULES } from '@/lib/constants/business';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export const BOOKING_STATUSES: BookingStatus[] = [
  'pending',
  'confirmed',
  'in-progress',
  'completed',
  'cancelled',
  'no-show',
];

export type BookingSource = 'website' | 'phone' | 'walk-in' | 'instagram' | 'admin';

export const BOOKING_SOURCES: BookingSource[] = [
  'website',
  'phone',
  'walk-in',
  'instagram',
  'admin',
];

/**
 * Estados que efetivamente OCUPAM a agenda do staff. Só estas reservas
 * bloqueiam um slot (usado no índice único anti-double-booking via
 * `blocksSlot`, e na deteção de conflitos).
 */
export const SLOT_BLOCKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'in-progress'];

export interface BookingServiceItem {
  serviceId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  /** Duração do serviço em minutos (tempo de cadeira) */
  duration: number;
  /** Buffer após este serviço (gap para o próximo serviço da mesma reserva) */
  bufferAfter: number;
}

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

export interface RemindersState {
  confirmation: boolean;
  dayBefore: boolean;
  hourBefore: boolean;
}

export interface IBooking {
  _id: mongoose.Types.ObjectId;
  bookingNumber: string;
  clientId?: mongoose.Types.ObjectId;
  guestInfo?: GuestInfo;
  staffId: mongoose.Types.ObjectId;
  services: BookingServiceItem[];
  /** Tempo total de cadeira (durações + buffers ENTRE serviços). endTime = startTime + isto */
  totalDuration: number;
  totalPrice: number;
  /** Buffer APÓS a reserva inteira (limpeza/preparação antes do próximo cliente). Só entra na deteção de conflito, não no endTime. */
  bufferAfter: number;
  startTime: Date;
  endTime: Date;
  /** true quando o status ocupa a agenda. Suporta o índice único parcial anti-double-booking. */
  blocksSlot: boolean;
  status: BookingStatus;
  source: BookingSource;
  notes?: string;
  internalNotes?: string;
  remindersSent: RemindersState;
  cancellationReason?: string;
  cancelledBy?: 'client' | 'staff' | 'system';
  cancelledAt?: Date;
  transactionId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const bookingServiceItemSchema = new Schema<BookingServiceItem>(
  {
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'price tem de ser em cêntimos integer',
      },
    },
    duration: { type: Number, required: true, min: 5, max: 600 },
    bufferAfter: { type: Number, required: true, default: 0, min: 0, max: 120 },
  },
  { _id: false },
);

const guestInfoSchema = new Schema<GuestInfo>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
  },
  { _id: false },
);

const remindersStateSchema = new Schema<RemindersState>(
  {
    confirmation: { type: Boolean, default: false },
    dayBefore: { type: Boolean, default: false },
    hourBefore: { type: Boolean, default: false },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 30,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      sparse: true,
    },
    guestInfo: guestInfoSchema,

    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },

    services: {
      type: [bookingServiceItemSchema],
      required: true,
      validate: {
        validator: (arr: BookingServiceItem[]) => arr.length > 0,
        message: 'Booking tem de ter pelo menos 1 serviço',
      },
    },
    totalDuration: { type: Number, required: true, min: 5, max: 600 },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalPrice tem de ser em cêntimos integer',
      },
    },
    bufferAfter: {
      type: Number,
      required: true,
      default: BOOKING_RULES.defaultBufferMinutes,
      min: 0,
      max: 120,
    },

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },

    blocksSlot: { type: Boolean, required: true, default: true },

    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: BOOKING_SOURCES,
      default: 'website',
      required: true,
    },

    notes: { type: String, trim: true, maxlength: 1000 },
    internalNotes: { type: String, trim: true, maxlength: 1000 },

    remindersSent: {
      type: remindersStateSchema,
      default: () => ({
        confirmation: false,
        dayBefore: false,
        hourBefore: false,
      }),
    },

    cancellationReason: { type: String, trim: true, maxlength: 500 },
    cancelledBy: {
      type: String,
      enum: ['client', 'staff', 'system'],
    },
    cancelledAt: { type: Date },

    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      sparse: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
  },
  { timestamps: true, versionKey: false },
);

// Índice único ANTI-DOUBLE-BOOKING: garante que não existem 2 reservas
// ativas para o mesmo staff no mesmo instante de início. Como a grelha
// mostrada ao cliente alinha sempre os starts (grelha de 30min), dois
// clientes a apanhar o mesmo slot colidem no mesmo startTime → E11000,
// que as server actions traduzem em "slot ocupado". Parcial via blocksSlot
// para que reservas canceladas/no-show/concluídas NÃO bloqueiem o slot.
bookingSchema.index(
  { staffId: 1, startTime: 1 },
  { unique: true, partialFilterExpression: { blocksSlot: true } },
);
bookingSchema.index({ staffId: 1, status: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ clientId: 1, startTime: -1 });
bookingSchema.index({ startTime: 1, status: 1 });
bookingSchema.index({
  status: 1,
  startTime: 1,
  'remindersSent.dayBefore': 1,
});
bookingSchema.index({ source: 1, startTime: -1 });

/**
 * Normalização + validação ANTES da validação de schema (pre-validate),
 * para que os campos derivados (totalDuration, endTime, bufferAfter,
 * blocksSlot) existam sempre e sejam a ÚNICA fonte da verdade —
 * independentemente de quem cria a reserva (site público ou admin).
 * Isto elimina a divergência online-vs-admin e garante endTime coerente.
 */
bookingSchema.pre('validate', function () {
  // Validação 1: cliente OU guest, não ambos vazios nem ambos preenchidos
  const hasClient = !!this.clientId;
  const hasGuest = !!this.guestInfo?.name;

  if (!hasClient && !hasGuest) {
    throw new Error('Booking tem de ter clientId OU guestInfo preenchido');
  }
  if (hasClient && hasGuest) {
    throw new Error('Booking não pode ter clientId E guestInfo simultaneamente — escolhe um');
  }

  // Derivar totalDuration, totalPrice e bufferAfter a partir dos serviços.
  // totalDuration = Σ durações + Σ buffers ENTRE serviços (todos exceto o último).
  // O buffer do ÚLTIMO serviço vira o buffer APÓS a reserva (bufferAfter),
  // usado apenas na deteção de conflitos, não no endTime.
  if (this.services && this.services.length > 0) {
    let chairTime = 0;
    for (let i = 0; i < this.services.length; i++) {
      chairTime += this.services[i].duration;
      if (i < this.services.length - 1) {
        chairTime += this.services[i].bufferAfter ?? 0;
      }
    }
    this.totalDuration = chairTime;
    this.totalPrice = this.services.reduce((sum, s) => sum + s.price, 0);

    const lastBuffer = this.services[this.services.length - 1].bufferAfter;
    this.bufferAfter = lastBuffer != null ? lastBuffer : BOOKING_RULES.defaultBufferMinutes;
  }

  // endTime SEMPRE derivado de startTime + totalDuration (à prova de bala).
  if (this.startTime && this.totalDuration) {
    this.endTime = new Date(this.startTime.getTime() + this.totalDuration * 60_000);
  }

  // Validação: endTime > startTime
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    throw new Error('endTime tem de ser depois de startTime');
  }

  // Validação: cancelled exige razão e cancelledBy
  if (this.status === 'cancelled') {
    if (!this.cancellationReason?.trim()) {
      throw new Error('Reservas canceladas têm de ter cancellationReason');
    }
    if (!this.cancelledBy) {
      throw new Error('Reservas canceladas têm de ter cancelledBy');
    }
  }

  // Ao mudar para cancelled, preencher cancelledAt
  if (this.isModified('status') && this.status === 'cancelled' && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }

  // blocksSlot: só reservas ativas ocupam a agenda (suporta índice único parcial)
  this.blocksSlot = SLOT_BLOCKING_STATUSES.includes(this.status);
});

bookingSchema.virtual('displayClientName').get(function (this: IBooking) {
  if (this.guestInfo?.name) return this.guestInfo.name;
  return 'Cliente registado';
});

bookingSchema.virtual('canBeCancelledByClient').get(function (this: IBooking) {
  if (this.status === 'cancelled' || this.status === 'completed') return false;
  const hoursUntil = (this.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntil >= 24;
});

bookingSchema.virtual('isPast').get(function (this: IBooking) {
  return this.endTime < new Date();
});

bookingSchema.virtual('isInProgress').get(function (this: IBooking) {
  const now = new Date();
  return this.startTime <= now && this.endTime > now;
});

bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

export const Booking: Model<IBooking> = models.Booking || model<IBooking>('Booking', bookingSchema);
