import mongoose, { Schema, model, models, type Model } from 'mongoose';
import { slugify } from './Category';

export interface IIncomeCategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const incomeCategorySchema = new Schema<IIncomeCategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      match: /^[a-z0-9-]+$/,
    },
    description: { type: String, trim: true, maxlength: 300 },
    color: {
      type: String,
      required: true,
      trim: true,
      match: /^#[0-9A-Fa-f]{6}$/,
      default: '#1F3D2E',
    },
    icon: { type: String, trim: true, maxlength: 60 },
    order: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

incomeCategorySchema.index({ active: 1, order: 1 });
incomeCategorySchema.index({ isDefault: 1 });

incomeCategorySchema.pre('save', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  if (this.isModified('active') && !this.active && this.isDefault) {
    throw new Error('Não é possível desativar uma categoria default');
  }
});

export const IncomeCategory: Model<IIncomeCategory> =
  models.IncomeCategory || model<IIncomeCategory>('IncomeCategory', incomeCategorySchema);
