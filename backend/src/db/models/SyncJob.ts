import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISyncJob extends Document {
  eventId: Types.ObjectId;
  source: string;
  sheetId?: string;
  status: 'running' | 'completed' | 'failed';
  imported?: number;
  skipped?: number;
  errorCount?: number;
  errors?: string[];
  rowCount?: number;
  totalRows?: number;
  truncated?: boolean;
  startedAt: Date;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SyncJobSchema = new Schema<ISyncJob>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    source: {
      type: String,
      required: true,
    },
    sheetId: String,
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    imported: Number,
    skipped: Number,
    errorCount: Number,
    errors: [String],
    rowCount: Number,
    totalRows: Number,
    truncated: Boolean,
    startedAt: {
      type: Date,
      default: new Date(),
    },
    finishedAt: Date,
  },
  {
    timestamps: true,
  }
);

SyncJobSchema.index({ eventId: 1, startedAt: -1 });

export const SyncJob = mongoose.model<ISyncJob>('SyncJob', SyncJobSchema);
