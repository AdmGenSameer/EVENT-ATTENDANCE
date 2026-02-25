import mongoose, { Schema, Document } from 'mongoose';

export interface IEvent extends Document {
  slug: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  sheetId: string;
  qrPublicKey: string;
  qrPrivateKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'COMPLETED'],
      default: 'DRAFT',
    },
    sheetId: {
      type: String,
      default: '',
    },
    qrPublicKey: {
      type: String,
      required: true,
    },
    qrPrivateKey: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default (security)
    },
  },
  {
    timestamps: true,
  }
);

// slug index is already created by unique: true
EventSchema.index({ status: 1 });

export const Event = mongoose.model<IEvent>('Event', EventSchema);
