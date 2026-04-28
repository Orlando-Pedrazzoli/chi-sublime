import mongoose, { Schema, model, models, type Model } from 'mongoose';
import { slugify } from './Category';

export interface IService {
  _id: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  name: { pt: string; en?: string };
  slug: string;
  description?: { pt?: string; en?: string };
  duration: number;
  price: number;
  vatRate: number;
  bufferAfter: number;
  staffIds: mongoose.Types.ObjectId[];
  image?: string;
  requiresDeposit: boolean;
  depositAmount: number;
  moloniProductId?: number;
  order: number;
  active: boolean;
  popular: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    name: {
      pt: { type: String, required: true, trim: true, maxlength: 120 },
      en: { type: String, trim: true, maxlength: 120 },
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
      match: /^[a-z0-9-]+$/,
    },
    description: {
      pt: { type: String, trim: true, maxlength: 1000 },
      en: { type: String, trim: true, maxlength: 1000 },
    },
    duration: { type: Number, required: true, min: 5, max: 600 },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'O preço tem de ser em cêntimos integer',
      },
    },
    vatRate: { type: Number, required: true, default: 23, min: 0, max: 100 },
    bufferAfter: { type: Number, default: 0, min: 0, max: 120 },
    staffIds: [{ type: Schema.Types.ObjectId, ref: 'Staff' }],
    image: { type: String, trim: true, maxlength: 500 },
    requiresDeposit: { type: Boolean, default: false },
    depositAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'O depósito tem de ser em cêntimos integer',
      },
    },
    moloniProductId: { type: Number, sparse: true },
    order: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    popular: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ categoryId: 1, active: 1, order: 1 });
serviceSchema.index({ popular: 1, active: 1 });
serviceSchema.index({ staffIds: 1, active: 1 });

serviceSchema.pre('save', function () {
  if (!this.slug && this.name?.pt) {
    this.slug = slugify(this.name.pt);
  }
  if (this.requiresDeposit && this.depositAmount <= 0) {
    throw new Error('Se requiresDeposit é true, depositAmount tem de ser maior que 0');
  }
});

serviceSchema.virtual('priceWithVat').get(function (this: IService) {
  return Math.round(this.price * (1 + this.vatRate / 100));
});

serviceSchema.set('toJSON', { virtuals: true });
serviceSchema.set('toObject', { virtuals: true });

export const Service: Model<IService> = models.Service || model<IService>('Service', serviceSchema);
