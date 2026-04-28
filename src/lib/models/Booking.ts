import mongoose, { Schema, model, models, type Model } from 'mongoose';

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

export interface BookingServiceItem {
  serviceId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  duration: number;
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
  totalDuration: number;
  totalPrice: number;
  startTime: Date;
  endTime: Date;
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

    startTime: { type: Date, required: true, index: true },
    endTime: { type: Date, required: true },

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

bookingSchema.index({ staffId: 1, startTime: 1 });
bookingSchema.index({ staffId: 1, status: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ clientId: 1, startTime: -1 });
bookingSchema.index({ startTime: 1, status: 1 });
bookingSchema.index({
  status: 1,
  startTime: 1,
  'remindersSent.dayBefore': 1,
});
bookingSchema.index({ source: 1, startTime: -1 });

bookingSchema.pre('save', function () {
  // Validação 1: cliente OU guest, não ambos vazios nem ambos preenchidos
  const hasClient = !!this.clientId;
  const hasGuest = !!this.guestInfo?.name;

  if (!hasClient && !hasGuest) {
    throw new Error('Booking tem de ter clientId OU guestInfo preenchido');
  }
  if (hasClient && hasGuest) {
    throw new Error('Booking não pode ter clientId E guestInfo simultaneamente — escolhe um');
  }

  // Validação 2: endTime > startTime
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    throw new Error('endTime tem de ser depois de startTime');
  }

  // Validação 3: cancelled exige razão e cancelledBy
  if (this.status === 'cancelled') {
    if (!this.cancellationReason?.trim()) {
      throw new Error('Reservas canceladas têm de ter cancellationReason');
    }
    if (!this.cancelledBy) {
      throw new Error('Reservas canceladas têm de ter cancelledBy');
    }
  }

  // Hook: ao mudar para cancelled, preencher cancelledAt
  if (this.isModified('status') && this.status === 'cancelled') {
    if (!this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }

  // Recalcular totalDuration e totalPrice a partir dos services
  if (this.services && this.services.length > 0) {
    this.totalDuration = this.services.reduce((sum, s) => sum + s.duration, 0);
    this.totalPrice = this.services.reduce((sum, s) => sum + s.price, 0);
  }
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
