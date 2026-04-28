import mongoose, { Schema, model, models, type Model } from 'mongoose';

export interface ICategory {
  _id: mongoose.Types.ObjectId;
  name: { pt: string; en?: string };
  slug: string;
  description?: { pt?: string; en?: string };
  icon?: string;
  color?: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: {
      pt: { type: String, required: true, trim: true, maxlength: 80 },
      en: { type: String, trim: true, maxlength: 80 },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 80,
      match: /^[a-z0-9-]+$/,
    },
    description: {
      pt: { type: String, trim: true, maxlength: 500 },
      en: { type: String, trim: true, maxlength: 500 },
    },
    icon: { type: String, trim: true, maxlength: 60 },
    color: { type: String, trim: true, match: /^#[0-9A-Fa-f]{6}$/ },
    order: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.index({ active: 1, order: 1 });

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

categorySchema.pre('save', function () {
  if (!this.slug && this.name?.pt) {
    this.slug = slugify(this.name.pt);
  }
});

export const Category: Model<ICategory> =
  models.Category || model<ICategory>('Category', categorySchema);
