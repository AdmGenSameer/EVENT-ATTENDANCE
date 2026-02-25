import mongoose, { Schema, Document, Types } from "mongoose";

export type SeatSection = "FRONT" | "REAR" | "BALCONY";
export type SeatStatus = "AVAILABLE" | "ASSIGNED" | "BLOCKED";

export interface ISeat extends Document {
  eventId: Types.ObjectId;
  section: SeatSection;
  row: string;
  number: number;
  seatCode: string;
  status: SeatStatus;
  ticketId?: Types.ObjectId | null;
  participantName?: string | null;
  assignedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SeatSchema = new Schema<ISeat>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },
    section: {
      type: String,
      enum: ["FRONT", "REAR", "BALCONY"],
      required: true,
    },
    row: {
      type: String,
      required: true,
    },
    number: {
      type: Number,
      required: true,
    },
    seatCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "ASSIGNED", "BLOCKED"],
      default: "AVAILABLE",
      index: true,
    },
    ticketId: {
      type: Schema.Types.ObjectId,
      ref: "Ticket",
      default: null,
    },
    participantName: {
      type: String,
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SeatSchema.index({ eventId: 1, section: 1, row: 1, number: 1 }, { unique: true });

export const Seat = mongoose.model<ISeat>("Seat", SeatSchema);
