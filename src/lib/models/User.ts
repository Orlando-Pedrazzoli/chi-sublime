import mongoose, { Schema, model, models, type Model } from 'mongoose';

export type UserRole = 'client' | 'staff' | 'admin';

export const USER_ROLES: UserRole[] = ['client', 'staff', 'admin'];

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash?: string;
  name: string;
  phone?: string;
  birthday?: Date;
  role: UserRole;
  staffId?: mongoose.Types.ObjectId;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  locale: 'pt' | 'en';
  preferredStaffId?: mongoose.Types.ObjectId;
  notes?: string;
  marketingConsent: boolean;
  newsletter: boolean;
  totalSpent: number;
  visitCount: number;
  loyaltyPoints: number;
  active: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      index: true,
    },
    passwordHash: { type: String, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 30 },
    birthday: { type: Date },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'client',
      required: true,
      index: true,
    },
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', sparse: true },

    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },

    locale: { type: String, enum: ['pt', 'en'], default: 'pt' },
    preferredStaffId: { type: Schema.Types.ObjectId, ref: 'Staff', sparse: true },
    notes: { type: String, trim: true, maxlength: 2000 },

    marketingConsent: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: false },

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
    loyaltyPoints: { type: Number, default: 0, min: 0 },

    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
);

userSchema.index({ role: 1, active: 1 });
userSchema.index({ emailVerificationToken: 1 }, { sparse: true });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

userSchema.pre('save', function () {
  if (this.role === 'staff' && !this.staffId) {
    throw new Error("Utilizador com role 'staff' tem de ter staffId associado");
  }
});

userSchema.virtual('initials').get(function (this: IUser) {
  return this.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
});

userSchema.virtual('isVerificationTokenValid').get(function (this: IUser) {
  if (!this.emailVerificationToken || !this.emailVerificationExpires) return false;
  return this.emailVerificationExpires > new Date();
});

userSchema.virtual('isResetTokenValid').get(function (this: IUser) {
  if (!this.passwordResetToken || !this.passwordResetExpires) return false;
  return this.passwordResetExpires > new Date();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.passwordHash;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpires;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    return obj;
  },
});

userSchema.set('toObject', { virtuals: true });

export const User: Model<IUser> = models.User || model<IUser>('User', userSchema);
