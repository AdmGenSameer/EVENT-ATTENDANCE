import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDuoParticipant {
  participantNumber: number;
  fullName: string;
  status: string;
}

export interface ITicket extends Document {
  eventId: Types.ObjectId;
  ticketCode: string;
  name: string;
  personalEmail: string;
  ticketType: 'GUEST' | 'COUPLE' | 'STUDENT' | 'CHILD';
  checkedIn: boolean;
  checkedInAt: Date | null;
  checkInTime: Date | null;
  checkInBy: string | null;
  seatNumber?: string | null;
  duoParticipants: IDuoParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

const DuoParticipantSchema = new Schema({
  participantNumber: Number,
  fullName: String,
  status: String,
}, { _id: false });

const TicketSchema = new Schema<ITicket>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    ticketCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    personalEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    ticketType: {
      type: String,
      enum: ['GUEST', 'COUPLE', 'STUDENT', 'CHILD'],
      required: true,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkInTime: {
      type: Date,
      default: null,
    },
    checkInBy: {
      type: String,
      default: null,
    },
    seatNumber: {
      type: String,
      default: null,
      index: true,
    },
    duoParticipants: [DuoParticipantSchema],
  },
  {
    timestamps: true,
  }
);

TicketSchema.index({ eventId: 1, ticketCode: 1 });
TicketSchema.index({ ticketCode: 1 });
TicketSchema.index({ eventId: 1, checkedIn: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
