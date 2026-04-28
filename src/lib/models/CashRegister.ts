import mongoose, { Schema, model, models, type Model } from 'mongoose';

export interface PaymentMethodBreakdown {
  cash: number;
  card_terminal: number;
  mb_way: number;
  multibanco: number;
  transfer: number;
  other: number;
}

export interface ICashRegister {
  _id: mongoose.Types.ObjectId;
  date: Date;
  openingCash: number;
  openedBy?: mongoose.Types.ObjectId;
  openedAt?: Date;
  totalIncome: number;
  totalExpense: number;
  incomeByPaymentMethod: PaymentMethodBreakdown;
  expenseByPaymentMethod: PaymentMethodBreakdown;
  closingCash: number;
  expectedCash: number;
  difference: number;
  differenceReason?: string;
  closedBy?: mongoose.Types.ObjectId;
  closedAt?: Date;
  closed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentMethodBreakdownSchema = new Schema<PaymentMethodBreakdown>(
  {
    cash: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'cash tem de ser integer',
      },
    },
    card_terminal: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'card_terminal tem de ser integer',
      },
    },
    mb_way: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'mb_way tem de ser integer',
      },
    },
    multibanco: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'multibanco tem de ser integer',
      },
    },
    transfer: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'transfer tem de ser integer',
      },
    },
    other: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'other tem de ser integer',
      },
    },
  },
  { _id: false },
);

const cashRegisterSchema = new Schema<ICashRegister>(
  {
    date: { type: Date, required: true, unique: true },

    openingCash: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'openingCash tem de ser em cêntimos integer',
      },
    },
    openedBy: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    openedAt: { type: Date },

    totalIncome: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalIncome tem de ser em cêntimos integer',
      },
    },
    totalExpense: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalExpense tem de ser em cêntimos integer',
      },
    },
    incomeByPaymentMethod: {
      type: paymentMethodBreakdownSchema,
      default: () => ({
        cash: 0,
        card_terminal: 0,
        mb_way: 0,
        multibanco: 0,
        transfer: 0,
        other: 0,
      }),
    },
    expenseByPaymentMethod: {
      type: paymentMethodBreakdownSchema,
      default: () => ({
        cash: 0,
        card_terminal: 0,
        mb_way: 0,
        multibanco: 0,
        transfer: 0,
        other: 0,
      }),
    },

    closingCash: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'closingCash tem de ser em cêntimos integer',
      },
    },
    expectedCash: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'expectedCash tem de ser em cêntimos integer',
      },
    },
    difference: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'difference tem de ser em cêntimos integer',
      },
    },
    differenceReason: { type: String, trim: true, maxlength: 500 },
    closedBy: { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
    closedAt: { type: Date },

    closed: { type: Boolean, default: false },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, versionKey: false },
);

cashRegisterSchema.index({ closed: 1, date: -1 });

cashRegisterSchema.pre('save', function () {
  // Recalcular expectedCash
  this.expectedCash =
    this.openingCash + this.incomeByPaymentMethod.cash - this.expenseByPaymentMethod.cash;

  // Recalcular difference se fechado
  if (this.closed) {
    this.difference = this.closingCash - this.expectedCash;

    if (!this.closedBy) {
      throw new Error('Caixa fechado tem de ter closedBy');
    }
    if (!this.closedAt) {
      this.closedAt = new Date();
    }
  }

  // Justificação obrigatória se há diferença
  if (this.difference !== 0 && !this.differenceReason?.trim()) {
    throw new Error(
      `Diferença de ${this.difference} cêntimos detetada. Justificação obrigatória em differenceReason.`,
    );
  }
});

cashRegisterSchema.virtual('netProfit').get(function (this: ICashRegister) {
  return this.totalIncome - this.totalExpense;
});

cashRegisterSchema.virtual('hasDiscrepancy').get(function (this: ICashRegister) {
  return this.closed && this.difference !== 0;
});

cashRegisterSchema.set('toJSON', { virtuals: true });
cashRegisterSchema.set('toObject', { virtuals: true });

export const CashRegister: Model<ICashRegister> =
  models.CashRegister || model<ICashRegister>('CashRegister', cashRegisterSchema);
