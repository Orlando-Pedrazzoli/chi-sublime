import mongoose, { Schema, model, models, type Model } from 'mongoose';

export type ScheduleType = 'regular' | 'holiday' | 'exception';

export const SCHEDULE_TYPES: ScheduleType[] = ['regular', 'holiday', 'exception'];

export interface ScheduleBreak {
  start: string;
  end: string;
}

export interface ISchedule {
  _id: mongoose.Types.ObjectId;
  type: ScheduleType;
  dayOfWeek?: number;
  date?: Date;
  open: boolean;
  start?: string;
  end?: string;
  breaks: ScheduleBreak[];
  reason?: string;
  recurringYearly: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scheduleBreakSchema = new Schema<ScheduleBreak>(
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

const scheduleSchema = new Schema<ISchedule>(
  {
    type: {
      type: String,
      enum: SCHEDULE_TYPES,
      required: true,
      index: true,
    },
    dayOfWeek: { type: Number, min: 0, max: 6, sparse: true },
    date: { type: Date, sparse: true },
    open: { type: Boolean, required: true, default: false },
    start: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    end: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
    },
    breaks: { type: [scheduleBreakSchema], default: [] },
    reason: { type: String, trim: true, maxlength: 200 },
    recurringYearly: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

scheduleSchema.index(
  { type: 1, dayOfWeek: 1 },
  { unique: true, partialFilterExpression: { type: 'regular' } },
);

scheduleSchema.index(
  { type: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $in: ['holiday', 'exception'] } },
  },
);

scheduleSchema.pre('save', function () {
  // Validação 1: regular ↔ dayOfWeek (não date)
  if (this.type === 'regular') {
    if (this.dayOfWeek === undefined || this.dayOfWeek === null) {
      throw new Error("Schedule type='regular' tem de ter dayOfWeek (0-6)");
    }
    if (this.date) {
      throw new Error("Schedule type='regular' não pode ter date");
    }
  } else if (this.type === 'holiday' || this.type === 'exception') {
    if (!this.date) {
      throw new Error(`Schedule type='${this.type}' tem de ter date`);
    }
    if (this.dayOfWeek !== undefined && this.dayOfWeek !== null) {
      throw new Error(`Schedule type='${this.type}' não pode ter dayOfWeek`);
    }
  }

  // Validação 2: open=true exige start e end válidos
  if (this.open) {
    if (!this.start || !this.end) {
      throw new Error('Se open=true, start e end são obrigatórios');
    }
    if (this.start >= this.end) {
      throw new Error(`start (${this.start}) tem de ser anterior a end (${this.end})`);
    }
  }

  // Validação 3: breaks dentro do horário
  if (this.open && this.start && this.end) {
    for (const brk of this.breaks ?? []) {
      if (brk.start >= brk.end) {
        throw new Error(
          `Break inválido: start (${brk.start}) tem de ser antes de end (${brk.end})`,
        );
      }
      if (brk.start < this.start || brk.end > this.end) {
        throw new Error(
          `Break (${brk.start}-${brk.end}) tem de estar dentro do horário (${this.start}-${this.end})`,
        );
      }
    }
  }

  // Aviso (não bloqueia)
  if (this.type === 'holiday' && this.open) {
    console.warn(
      `Schedule holiday com open=true detetado (date=${this.date}). ` +
        `Verifica se era mesmo intencional ou se devia ser type='exception'.`,
    );
  }
});

scheduleSchema.virtual('dayName').get(function (this: ISchedule) {
  if (this.type !== 'regular' || this.dayOfWeek === undefined) return null;
  const days = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  return days[this.dayOfWeek];
});

scheduleSchema.set('toJSON', { virtuals: true });
scheduleSchema.set('toObject', { virtuals: true });

export const Schedule: Model<ISchedule> =
  models.Schedule || model<ISchedule>('Schedule', scheduleSchema);
