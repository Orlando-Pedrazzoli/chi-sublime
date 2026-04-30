import mongoose, { Schema, model, models, type Model } from 'mongoose';

export type UserRole = 'client' | 'admin';
export const USER_ROLES: UserRole[] = ['client', 'admin'];

export interface IUser {
  _id: mongoose.Types.ObjectId;

  // Identidade
  email: string;
  passwordHash?: string; // select: false
  name: string;
  phone?: string;

  // Autorização
  role: UserRole;

  // Vinculação ao Client (ficha do salão)
  // Sempre presente para role: 'client'.
  // Ausente para role: 'admin' (Jean Pierre não é cliente).
  clientId?: mongoose.Types.ObjectId;

  // Recuperação de password
  passwordResetToken?: string; // select: false
  passwordResetExpires?: Date; // select: false

  // Estado
  active: boolean;
  lastLoginAt?: Date;

  // Timestamps
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

    passwordHash: {
      type: String,
      select: false,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    phone: {
      type: String,
      trim: true,
      maxlength: 30,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      default: 'client',
      required: true,
      index: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      sparse: true,
    },

    passwordResetToken: {
      type: String,
      select: false,
    },

    passwordResetExpires: {
      type: Date,
      select: false,
    },

    active: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Indexes compostos para queries comuns
userSchema.index({ role: 1, active: 1 });
userSchema.index({ passwordResetToken: 1 }, { sparse: true });

/**
 * Validações de invariantes de negócio.
 *
 * Mongoose 9 workaround: usar pre('save') em vez de pre('validate').
 * Lançar Error directamente em vez de next(err).
 */
userSchema.pre('save', function () {
  // Cliente registado tem de ter clientId vinculado
  if (this.role === 'client' && !this.clientId) {
    throw new Error("Utilizador com role 'client' tem de ter clientId vinculado");
  }

  // Admin não deve ter clientId (Jean Pierre não é cliente do salão)
  if (this.role === 'admin' && this.clientId) {
    throw new Error("Utilizador com role 'admin' não deve ter clientId");
  }

  // Garantir que tokens de reset têm sempre data de expiração e vice-versa
  const hasToken = !!this.passwordResetToken;
  const hasExpiry = !!this.passwordResetExpires;
  if (hasToken !== hasExpiry) {
    throw new Error('passwordResetToken e passwordResetExpires têm de coexistir');
  }
});

// Virtuals
userSchema.virtual('initials').get(function (this: IUser) {
  return this.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
});

userSchema.virtual('isResetTokenValid').get(function (this: IUser) {
  if (!this.passwordResetToken || !this.passwordResetExpires) return false;
  return this.passwordResetExpires > new Date();
});

// Serialização segura — remove sempre campos sensíveis ao converter para JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    const obj = ret as unknown as Record<string, unknown>;
    delete obj.passwordHash;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    return obj;
  },
});

userSchema.set('toObject', { virtuals: true });

export const User: Model<IUser> = models.User || model<IUser>('User', userSchema);
