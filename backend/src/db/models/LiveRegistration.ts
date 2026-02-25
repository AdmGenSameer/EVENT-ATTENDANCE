import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILiveRegistration extends Document {
  eventId: Types.ObjectId;
  isLive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LiveRegistrationSchema = new Schema<ILiveRegistration>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      unique: true,
      index: true,
    },
    isLive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const LiveRegistration = mongoose.model<ILiveRegistration>("LiveRegistration", LiveRegistrationSchema);
