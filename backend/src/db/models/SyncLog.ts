import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISyncLog extends Document {
  eventId: Types.ObjectId;
  scannerId: string;
  checkedInTickets: string[];
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SyncLogSchema = new Schema<ISyncLog>(
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
    checkedInTickets: [{
      type: String,
      ref: 'Ticket',
    }],
    syncedAt: {
      type: Date,
      default: new Date(),
    },
  },
  {
    timestamps: true,
  }
);

SyncLogSchema.index({ eventId: 1, scannerId: 1 });
SyncLogSchema.index({ syncedAt: -1 });

export const SyncLog = mongoose.model<ISyncLog>('SyncLog', SyncLogSchema);
