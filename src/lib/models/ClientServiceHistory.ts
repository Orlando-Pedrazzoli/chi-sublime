import mongoose, { Schema, model, models, type Model } from 'mongoose';

export interface IClientServiceHistory {
  _id: mongoose.Types.ObjectId;
  clientId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;
  serviceName: string;
  categoryName?: string;
  staffId: mongoose.Types.ObjectId;
  staffName: string;
  date: Date;
  duration: number;
  price: number;
  technicalNotes?: string;
  productsUsed: string[];
  sessionNotes?: string;
  satisfactionRating?: number;
  repeatable: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastEditedBy?: mongoose.Types.ObjectId;
  lastEditedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const clientServiceHistorySchema = new Schema<IClientServiceHistory>(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
      index: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      sparse: true,
    },

    serviceId: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    serviceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    categoryName: { type: String, trim: true, maxlength: 80 },

    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'Staff',
      required: true,
      index: true,
    },
    staffName: { type: String, required: true, trim: true, maxlength: 100 },

    date: { type: Date, required: true, index: true },
    duration: { type: Number, required: true, min: 1, max: 600 },

    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'price tem de ser em cêntimos integer',
      },
    },

    technicalNotes: { type: String, trim: true, maxlength: 2000 },
    productsUsed: [{ type: String, trim: true, maxlength: 200 }],
    sessionNotes: { type: String, trim: true, maxlength: 1000 },

    satisfactionRating: { type: Number, min: 1, max: 5 },
    repeatable: { type: Boolean, default: true },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastEditedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    lastEditedAt: { type: Date, sparse: true },
  },
  { timestamps: true, versionKey: false },
);

clientServiceHistorySchema.index({ clientId: 1, date: -1 });
clientServiceHistorySchema.index({ staffId: 1, date: -1 });
clientServiceHistorySchema.index({ serviceId: 1, date: -1 });
clientServiceHistorySchema.index({ clientId: 1, serviceId: 1, date: -1 });
clientServiceHistorySchema.index({ repeatable: 1, serviceId: 1 });

clientServiceHistorySchema.pre('save', function () {
  if (
    !this.isNew &&
    (this.isModified('technicalNotes') ||
      this.isModified('productsUsed') ||
      this.isModified('sessionNotes'))
  ) {
    this.lastEditedAt = new Date();
  }
});

clientServiceHistorySchema.virtual('hasTechnicalDetails').get(function (
  this: IClientServiceHistory,
) {
  return Boolean(
    this.technicalNotes?.trim() || (this.productsUsed && this.productsUsed.length > 0),
  );
});

clientServiceHistorySchema.set('toJSON', { virtuals: true });
clientServiceHistorySchema.set('toObject', { virtuals: true });

export const ClientServiceHistory: Model<IClientServiceHistory> =
  models.ClientServiceHistory ||
  model<IClientServiceHistory>('ClientServiceHistory', clientServiceHistorySchema);
