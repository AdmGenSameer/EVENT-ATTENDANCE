import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IScanner extends Document {
  eventId: Types.ObjectId;
  scannerId: string;
  lastSyncTime: Date;
  totalCheckedIn: number;
  createdAt: Date;
  updatedAt: Date;
}

const ScannerSchema = new Schema<IScanner>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    scannerId: {
      type: String,
      required: true,
    },
    lastSyncTime: {
      type: Date,
      default: new Date(),
    },
    totalCheckedIn: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

ScannerSchema.index({ eventId: 1, scannerId: 1 }, { unique: true });

export const Scanner = mongoose.model<IScanner>('Scanner', ScannerSchema);
