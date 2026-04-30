import mongoose, { Schema, model, models, type Model } from 'mongoose';

export type ClientSource = 'online' | 'walk-in' | 'phone' | 'referral' | 'instagram';

export const CLIENT_SOURCES: ClientSource[] = [
  'online',
  'walk-in',
  'phone',
  'referral',
  'instagram',
];

export interface FiscalData {
  vatNumber?: string;
  fullLegalName?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country: string;
}

export interface IClient {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  birthday?: Date;
  fiscalData?: FiscalData;
  preferredStaffId?: mongoose.Types.ObjectId;
  notes?: string;
  preferredInvoiceEmail?: string;
  source: ClientSource;
  referredBy?: mongoose.Types.ObjectId;
  totalSpent: number;
  visitCount: number;
  lastVisit?: Date;
  averageTicket: number;
  favoriteServiceId?: mongoose.Types.ObjectId;
  loyaltyPoints: number;
  tags: string[];
  marketingConsent: boolean;
  blocked: boolean;
  blockedReason?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fiscalDataSchema = new Schema<FiscalData>(
  {
    vatNumber: { type: String, trim: true, match: /^\d{9}$/ },
    fullLegalName: { type: String, trim: true, maxlength: 200 },
    address: { type: String, trim: true, maxlength: 300 },
    postalCode: { type: String, trim: true, match: /^\d{4}-\d{3}$/ },
    city: { type: String, trim: true, maxlength: 100 },
    country: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 2,
      default: 'PT',
    },
  },
  { _id: false },
);

const clientSchema = new Schema<IClient>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, required: true, trim: true, maxlength: 30 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      sparse: true,
    },
    birthday: { type: Date },

    fiscalData: fiscalDataSchema,

    preferredStaffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      sparse: true,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    preferredInvoiceEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    source: {
      type: String,
      enum: CLIENT_SOURCES,
      default: 'walk-in',
      required: true,
    },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      sparse: true,
    },

    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalSpent tem de ser em cêntimos integer',
      },
    },
    visitCount: { type: Number, default: 0, min: 0 },
    lastVisit: { type: Date },
    averageTicket: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'averageTicket tem de ser em cêntimos integer',
      },
    },
    favoriteServiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      sparse: true,
    },
    loyaltyPoints: { type: Number, default: 0, min: 0 },

    tags: [{ type: String, trim: true, maxlength: 30 }],

    marketingConsent: { type: Boolean, default: false },
    blocked: { type: Boolean, default: false },
    blockedReason: { type: String, trim: true, maxlength: 500 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

clientSchema.index({ name: 'text' });
clientSchema.index({ phone: 1, active: 1 });
clientSchema.index({ active: 1, lastVisit: -1 });
clientSchema.index({ tags: 1, active: 1 });
clientSchema.index({ totalSpent: -1, active: 1 });

clientSchema.pre('save', function () {
  // Recalcula averageTicket
  if (this.visitCount > 0) {
    this.averageTicket = Math.round(this.totalSpent / this.visitCount);
  } else {
    this.averageTicket = 0;
  }

  // Validação: blocked precisa de razão
  if (this.blocked && !this.blockedReason?.trim()) {
    throw new Error('Cliente bloqueado tem de ter blockedReason');
  }
});

clientSchema.virtual('initials').get(function (this: IClient) {
  return this.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
});

clientSchema.virtual('isVip').get(function (this: IClient) {
  return this.totalSpent >= 50000 || this.tags.includes('VIP');
});

clientSchema.set('toJSON', { virtuals: true });
clientSchema.set('toObject', { virtuals: true });

export const Client: Model<IClient> = models.Client || model<IClient>('Client', clientSchema);
