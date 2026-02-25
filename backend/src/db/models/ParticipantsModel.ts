import mongoose, { Schema } from "mongoose";

const participantsSchema = new Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    checkedIn: {
      type: Boolean,
      default: false,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },
    qrData: {
      type: String,
      default: null,
    },
    ticketType: {
      type: String,
      default: "REGULAR_SINGLE",
    },
  },
  { timestamps: true }
);

export const Participants = mongoose.model(
  "Participants",
  participantsSchema
);