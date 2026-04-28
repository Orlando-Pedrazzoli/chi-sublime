import mongoose, { Schema, model, models, type Model } from 'mongoose';
import type { InvoiceProviderId } from './Transaction';

export interface MoloniConfig {
  enabled: boolean;
  companyId?: number;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  defaultDocumentSetId?: number;
  defaultPaymentMethodId?: number;
  defaultMaturityDateId?: number;
  consumidorFinalCustomerId?: number;
  vatTaxId?: number;
  paymentMethods?: {
    cash?: number;
    card_terminal?: number;
    mb_way?: number;
    multibanco?: number;
    transfer?: number;
    other?: number;
  };
  taxIds?: {
    vat_0?: number;
    vat_6?: number;
    vat_13?: number;
    vat_23?: number;
  };
}

export interface IFiscalSettings {
  _id: mongoose.Types.ObjectId;
  key: string;
  companyName: string;
  tradingName?: string;
  vatNumber: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  iban?: string;
  swift?: string;
  fiscalEmail?: string;
  phone?: string;
  invoiceProvider: InvoiceProviderId;
  moloni: MoloniConfig;
  defaultVatRate: number;
  vatExemptionReason?: string;
  defaultCurrency: string;
  incomePrefix: string;
  expensePrefix: string;
  bookingPrefix: string;
  autoSendInvoiceEmail: boolean;
  invoiceEmailSubject: string;
  invoiceEmailBody: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const moloniConfigSchema = new Schema<MoloniConfig>(
  {
    enabled: { type: Boolean, default: false },
    companyId: { type: Number },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    tokenExpiresAt: { type: Date },
    defaultDocumentSetId: { type: Number },
    defaultPaymentMethodId: { type: Number },
    defaultMaturityDateId: { type: Number },
    consumidorFinalCustomerId: { type: Number },
    vatTaxId: { type: Number },
    paymentMethods: {
      cash: { type: Number },
      card_terminal: { type: Number },
      mb_way: { type: Number },
      multibanco: { type: Number },
      transfer: { type: Number },
      other: { type: Number },
    },
    taxIds: {
      vat_0: { type: Number },
      vat_6: { type: Number },
      vat_13: { type: Number },
      vat_23: { type: Number },
    },
  },
  { _id: false },
);

const fiscalSettingsSchema = new Schema<IFiscalSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      enum: ['default'], // SINGLETON enforcement: só permite "default"
    },

    companyName: { type: String, required: true, trim: true, maxlength: 200 },
    tradingName: { type: String, trim: true, maxlength: 200 },
    vatNumber: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{9}$/,
    },
    address: { type: String, required: true, trim: true, maxlength: 300 },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{3}$/,
    },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    country: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 2,
      default: 'PT',
    },
    iban: { type: String, trim: true, maxlength: 34, uppercase: true },
    swift: { type: String, trim: true, maxlength: 11, uppercase: true },

    fiscalEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 255,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: { type: String, trim: true, maxlength: 30 },

    invoiceProvider: {
      type: String,
      enum: ['moloni', 'invoicexpress', 'vendus', 'atura', 'mock'],
      required: true,
      default: 'mock',
    },
    moloni: {
      type: moloniConfigSchema,
      default: () => ({ enabled: false }),
    },

    defaultVatRate: {
      type: Number,
      required: true,
      default: 23,
      min: 0,
      max: 100,
    },
    vatExemptionReason: { type: String, trim: true, maxlength: 200 },
    defaultCurrency: {
      type: String,
      required: true,
      uppercase: true,
      maxlength: 3,
      default: 'EUR',
    },

    incomePrefix: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 5,
      default: 'RX',
    },
    expensePrefix: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 5,
      default: 'DX',
    },
    bookingPrefix: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      maxlength: 5,
      default: 'CHI',
    },

    autoSendInvoiceEmail: { type: Boolean, default: true },
    invoiceEmailSubject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      default: 'Chi Sublime — A sua fatura',
    },
    invoiceEmailBody: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
      default: `Olá,\n\nObrigado pela sua visita ao Chi Sublime.\n\nEm anexo encontra a fatura referente aos serviços prestados.\n\nCom os melhores cumprimentos,\nChi Sublime — Hair Style & Beauty\nCascais`,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
  },
  { timestamps: true, versionKey: false },
);

// ============================================================
// Helpers
// ============================================================

/**
 * Obtém o documento singleton de FiscalSettings.
 * Cria com defaults se não existir.
 */
export async function getFiscalSettings(): Promise<IFiscalSettings> {
  let settings = await FiscalSettings.findOne({ key: 'default' });

  if (!settings) {
    settings = await FiscalSettings.create({
      key: 'default',
      companyName: 'Chi Sublime — Hair Style & Beauty',
      vatNumber: '000000000',
      address: 'R. Estorninho, Loja E, Quinta da Bicuda',
      postalCode: '2750-686',
      city: 'Cascais',
      country: 'PT',
    });
  }

  return settings;
}

/**
 * Obtém FiscalSettings COM tokens (uso interno em integrações).
 */
export async function getFiscalSettingsWithTokens(): Promise<IFiscalSettings | null> {
  return FiscalSettings.findOne({ key: 'default' })
    .select('+moloni.accessToken +moloni.refreshToken')
    .lean();
}

// ============================================================
// Model singleton
// ============================================================

export const FiscalSettings: Model<IFiscalSettings> =
  models.FiscalSettings || model<IFiscalSettings>('FiscalSettings', fiscalSettingsSchema);
