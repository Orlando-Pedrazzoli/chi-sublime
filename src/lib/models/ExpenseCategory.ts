import mongoose, { Schema, model, models, type Model } from 'mongoose';
import { slugify } from './Category';

export interface IExpenseCategory {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  color: string;
  icon?: string;
  order: number;
  isFixed: boolean;
  monthlyBudget: number;
  active: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const expenseCategorySchema = new Schema<IExpenseCategory>(
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
      default: '#B23C3C',
    },
    icon: { type: String, trim: true, maxlength: 60 },
    order: { type: Number, default: 0, min: 0 },

    isFixed: { type: Boolean, default: false },
    monthlyBudget: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'monthlyBudget tem de ser em cêntimos integer',
      },
    },

    active: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

expenseCategorySchema.index({ active: 1, order: 1 });
expenseCategorySchema.index({ isFixed: 1, active: 1 });
expenseCategorySchema.index({ isDefault: 1 });

expenseCategorySchema.pre('save', function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }

  if (this.isModified('active') && !this.active && this.isDefault) {
    throw new Error('Não é possível desativar uma categoria default');
  }
});

export const ExpenseCategory: Model<IExpenseCategory> =
  models.ExpenseCategory || model<IExpenseCategory>('ExpenseCategory', expenseCategorySchema);
