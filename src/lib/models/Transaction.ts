import mongoose, { Schema, model, models, type Model } from 'mongoose';

export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'completed' | 'pending' | 'refunded' | 'cancelled';

export type PaymentMethod =
  | 'cash'
  | 'card_terminal'
  | 'mb_way'
  | 'multibanco'
  | 'transfer'
  | 'other';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'cash',
  'card_terminal',
  'mb_way',
  'multibanco',
  'transfer',
  'other',
];

export type DocumentType = 'FT' | 'FR' | 'FS' | 'NC' | 'ND';

export type InvoiceProviderId = 'moloni' | 'invoicexpress' | 'vendus' | 'atura' | 'mock';

export interface TransactionServiceItem {
  serviceId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  discount: number;
}

export interface CustomerSnapshot {
  name: string;
  vatNumber?: string;
  email?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country: string;
}

export interface InvoiceData {
  issued: boolean;
  issuedAt?: Date;
  provider: InvoiceProviderId;
  certificationNumber: string;
  customerSnapshot: CustomerSnapshot;
  externalDocumentId: string;
  documentNumber: string;
  series: string;
  atcud: string;
  documentType: DocumentType;
  pdfUrl: string;
  qrCodeUrl?: string;
  sentToCustomer: boolean;
  sentAt?: Date;
  customerEmail?: string;
  apiResponseLog?: unknown;
  creditNoteId?: string;
  creditNoteNumber?: string;
}

export interface RecurringConfig {
  enabled: boolean;
  frequency: 'weekly' | 'monthly' | 'yearly';
  nextDueDate: Date;
}

export interface InvoiceError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

export interface ITransaction {
  _id: mongoose.Types.ObjectId;
  transactionNumber: string;
  type: TransactionType;
  date: Date;
  amount: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  clientId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  staffId?: mongoose.Types.ObjectId;
  incomeCategoryId?: mongoose.Types.ObjectId;
  services?: TransactionServiceItem[];
  tipAmount: number;
  expenseCategoryId?: mongoose.Types.ObjectId;
  supplier?: string;
  supplierInvoiceNumber?: string;
  invoiceFile?: string;
  recurring?: RecurringConfig;
  paymentMethod: PaymentMethod;
  description?: string;
  notes?: string;
  invoiceRequested: boolean;
  invoiceData?: InvoiceData;
  invoiceError?: InvoiceError;
  status: TransactionStatus;
  refundedTransactionId?: mongoose.Types.ObjectId;
  refundTransactionId?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const transactionServiceItemSchema = new Schema<TransactionServiceItem>(
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
    quantity: { type: Number, required: true, min: 1, default: 1 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
);

const customerSnapshotSchema = new Schema<CustomerSnapshot>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    vatNumber: { type: String, trim: true, match: /^\d{9}$/ },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
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

const invoiceDataSchema = new Schema<InvoiceData>(
  {
    issued: { type: Boolean, default: false },
    issuedAt: { type: Date },
    provider: {
      type: String,
      enum: ['moloni', 'invoicexpress', 'vendus', 'atura', 'mock'],
      required: true,
    },
    certificationNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30,
    },
    customerSnapshot: customerSnapshotSchema,
    externalDocumentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    documentNumber: { type: String, required: true, trim: true, maxlength: 50 },
    series: { type: String, required: true, trim: true, maxlength: 30 },
    atcud: { type: String, required: true, trim: true, maxlength: 50 },
    documentType: {
      type: String,
      enum: ['FT', 'FR', 'FS', 'NC', 'ND'],
      required: true,
    },
    pdfUrl: { type: String, required: true, trim: true, maxlength: 500 },
    qrCodeUrl: { type: String, trim: true, maxlength: 500 },
    sentToCustomer: { type: Boolean, default: false },
    sentAt: { type: Date },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    apiResponseLog: { type: Schema.Types.Mixed },
    creditNoteId: { type: String, trim: true, maxlength: 100 },
    creditNoteNumber: { type: String, trim: true, maxlength: 50 },
  },
  { _id: false },
);

const recurringConfigSchema = new Schema<RecurringConfig>(
  {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      required: true,
    },
    nextDueDate: { type: Date, required: true },
  },
  { _id: false },
);

const invoiceErrorSchema = new Schema<InvoiceError>(
  {
    code: { type: String, required: true, trim: true, maxlength: 50 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    timestamp: { type: Date, required: true, default: Date.now },
    retryable: { type: Boolean, default: false },
  },
  { _id: false },
);

const transactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 30,
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
      index: true,
    },
    date: { type: Date, required: true, default: Date.now, index: true },

    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'amount tem de ser em cêntimos integer',
      },
    },
    vatRate: { type: Number, required: true, default: 23, min: 0, max: 100 },
    vatAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'vatAmount tem de ser em cêntimos integer',
      },
    },
    totalWithVat: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'totalWithVat tem de ser em cêntimos integer',
      },
    },

    clientId: { type: Schema.Types.ObjectId, ref: 'Client', sparse: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', sparse: true },
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', sparse: true },
    incomeCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'IncomeCategory',
      sparse: true,
    },
    services: [transactionServiceItemSchema],
    tipAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'tipAmount tem de ser em cêntimos integer',
      },
    },

    expenseCategoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      sparse: true,
    },
    supplier: { type: String, trim: true, maxlength: 200 },
    supplierInvoiceNumber: { type: String, trim: true, maxlength: 50 },
    invoiceFile: { type: String, trim: true, maxlength: 500 },
    recurring: recurringConfigSchema,

    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: true,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, trim: true, maxlength: 1000 },

    invoiceRequested: { type: Boolean, default: false, index: true },
    invoiceData: invoiceDataSchema,
    invoiceError: invoiceErrorSchema,

    status: {
      type: String,
      enum: ['completed', 'pending', 'refunded', 'cancelled'],
      default: 'completed',
      required: true,
      index: true,
    },
    refundedTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      sparse: true,
    },
    refundTransactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      sparse: true,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, versionKey: false },
);

transactionSchema.index({ date: -1, type: 1 });
transactionSchema.index({ staffId: 1, type: 1, date: -1 });
transactionSchema.index({ clientId: 1, date: -1 });
transactionSchema.index({ incomeCategoryId: 1, date: -1 });
transactionSchema.index({ expenseCategoryId: 1, date: -1 });
transactionSchema.index({ invoiceRequested: 1, 'invoiceData.issued': 1 });
transactionSchema.index({ 'recurring.enabled': 1, 'recurring.nextDueDate': 1 });
transactionSchema.index({ date: -1, paymentMethod: 1, status: 1 });

transactionSchema.pre('save', function () {
  // Validação 1: receitas têm incomeCategoryId, despesas têm expenseCategoryId
  if (this.type === 'income') {
    if (!this.incomeCategoryId) {
      throw new Error('Receita tem de ter incomeCategoryId');
    }
    if (this.expenseCategoryId) {
      throw new Error('Receita não pode ter expenseCategoryId');
    }
  } else if (this.type === 'expense') {
    if (!this.expenseCategoryId) {
      throw new Error('Despesa tem de ter expenseCategoryId');
    }
    if (this.incomeCategoryId) {
      throw new Error('Despesa não pode ter incomeCategoryId');
    }
  }

  // Validação 2: totalWithVat = amount + vatAmount
  const expectedTotal = this.amount + this.vatAmount;
  if (this.totalWithVat !== expectedTotal) {
    throw new Error(
      `Inconsistência: totalWithVat (${this.totalWithVat}) != amount (${this.amount}) + vatAmount (${this.vatAmount})`,
    );
  }

  // Validação 3: vatAmount = round(amount * vatRate / 100)
  const expectedVat = Math.round((this.amount * this.vatRate) / 100);
  if (this.vatAmount !== expectedVat) {
    throw new Error(
      `Inconsistência: vatAmount (${this.vatAmount}) deveria ser ${expectedVat} (= ${this.amount} * ${this.vatRate}%)`,
    );
  }
});

transactionSchema.virtual('isInvoiced').get(function (this: ITransaction) {
  return Boolean(this.invoiceData?.issued);
});

transactionSchema.virtual('isInvoicePending').get(function (this: ITransaction) {
  return this.invoiceRequested && !this.invoiceData?.issued;
});

transactionSchema.virtual('canRetryInvoice').get(function (this: ITransaction) {
  return (
    this.invoiceRequested && !this.invoiceData?.issued && Boolean(this.invoiceError?.retryable)
  );
});

transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

export const Transaction: Model<ITransaction> =
  models.Transaction || model<ITransaction>('Transaction', transactionSchema);
