// 📄 src/lib/models/Staff.ts
import mongoose, { Schema, model, models, type Model } from 'mongoose';
import { slugify } from './Category';
import {
  SALON_DEFAULT_END,
  SALON_DEFAULT_START,
  SALON_HOURS_BY_NAME,
} from '@/lib/constants/business';

export type WeekDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const WEEKDAYS: WeekDay[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export interface WorkBreak {
  start: string;
  end: string;
}

export interface WorkDayConfig {
  enabled: boolean;
  start: string;
  end: string;
  breaks: WorkBreak[];
}

export interface VacationPeriod {
  from: Date;
  to: Date;
  reason?: string;
}

export interface IStaff {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  role: { pt: string; en?: string };
  bio?: { pt?: string; en?: string };
  specialty?: { pt?: string; en?: string };
  photo?: string;
  specialties: string[];
  email?: string;
  phone?: string;
  workingHours: Record<WeekDay, WorkDayConfig>;
  vacations: VacationPeriod[];
  commissionRate?: number;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const workBreakSchema = new Schema<WorkBreak>(
  {
    start: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    end: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
  },
  { _id: false },
);

const workDayConfigSchema = new Schema<WorkDayConfig>(
  {
    enabled: { type: Boolean, default: false },
    start: {
      type: String,
      default: SALON_DEFAULT_START,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    end: {
      type: String,
      default: SALON_DEFAULT_END,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    breaks: { type: [workBreakSchema], default: [] },
  },
  { _id: false },
);

const vacationPeriodSchema = new Schema<VacationPeriod>(
  {
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String, trim: true, maxlength: 200 },
  },
  { _id: false },
);

/**
 * Horário por defeito de um NOVO profissional = horário do salão.
 * Derivado de SALON_HOURS_BY_NAME — nunca hardcoded, para um staff
 * novo nunca nascer com um horário que o salão já não pratica.
 *
 * ⚠️ Isto só afeta documentos NOVOS. Os profissionais já gravados
 * mantêm o que está em BD — usar scripts/fix-salon-hours.ts.
 */
function defaultWorkingHours(): Record<WeekDay, WorkDayConfig> {
  const out = {} as Record<WeekDay, WorkDayConfig>;
  for (const day of WEEKDAYS) {
    const salon = SALON_HOURS_BY_NAME[day];
    out[day] = {
      enabled: salon.open,
      start: salon.open ? salon.start : SALON_DEFAULT_START,
      end: salon.open ? salon.end : SALON_DEFAULT_END,
      breaks: [],
    };
  }
  return out;
}

const staffSchema = new Schema<IStaff>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
      match: /^[a-z0-9-]+$/,
    },
    role: {
      pt: { type: String, required: true, trim: true, maxlength: 80 },
      en: { type: String, trim: true, maxlength: 80 },
    },
    bio: {
      pt: { type: String, trim: true, maxlength: 1000 },
      en: { type: String, trim: true, maxlength: 1000 },
    },
    specialty: {
      pt: { type: String, trim: true, maxlength: 200 },
      en: { type: String, trim: true, maxlength: 200 },
    },
    photo: { type: String, trim: true, maxlength: 500 },
    specialties: [{ type: String, trim: true, maxlength: 50 }],
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, trim: true, maxlength: 30 },
    workingHours: { type: Object, default: defaultWorkingHours },
    vacations: { type: [vacationPeriodSchema], default: [] },
    commissionRate: { type: Number, min: 0, max: 100 },
    order: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false, minimize: false },
);

staffSchema.index({ active: 1, order: 1 });
staffSchema.index({ active: 1, slug: 1 });

staffSchema.pre('save', function () {
  // Gerar slug se vazio
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  // Validar workingHours
  if (this.workingHours) {
    for (const day of WEEKDAYS) {
      const config = this.workingHours[day];
      if (config?.enabled && config.start >= config.end) {
        throw new Error(
          `Horário inválido em ${day}: start (${config.start}) tem de ser anterior a end (${config.end})`,
        );
      }
      for (const brk of config?.breaks ?? []) {
        if (brk.start >= brk.end) {
          throw new Error(
            `Break inválido em ${day}: start (${brk.start}) tem de ser anterior a end (${brk.end})`,
          );
        }
        if (config.enabled && (brk.start < config.start || brk.end > config.end)) {
          throw new Error(
            `Break em ${day} (${brk.start}-${brk.end}) tem de estar dentro do horário (${config.start}-${config.end})`,
          );
        }
      }
    }
  }

  // Validar vacations
  for (const vac of this.vacations ?? []) {
    if (vac.to < vac.from) {
      throw new Error('Período de férias inválido: data fim antes de data início');
    }
  }
});

staffSchema.virtual('initials').get(function (this: IStaff) {
  return this.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
});

staffSchema.set('toJSON', { virtuals: true });
staffSchema.set('toObject', { virtuals: true });

export const Staff: Model<IStaff> = models.Staff || model<IStaff>('Staff', staffSchema);
