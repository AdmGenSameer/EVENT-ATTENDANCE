import { Types } from "mongoose";
import { LiveRegistration } from "../db/models/LiveRegistration";
import { logInfo, logError } from "../utils/logger";

export class LiveRegistrationService {
  async getLiveStatus(eventId: string) {
    try {
      logInfo("liveReg:get", `Fetching live status for event ${eventId}`);

      const eventObjectId = new Types.ObjectId(eventId);
      let liveReg = await LiveRegistration.findOne({ eventId: eventObjectId });

      // Initialize if doesn't exist
      if (!liveReg) {
        liveReg = await LiveRegistration.create({
          eventId: eventObjectId,
          isLive: false,
        });
        logInfo("liveReg:get", `Initialized live registration for event ${eventId}`);
      }

      return liveReg;
    } catch (error) {
      logError("liveReg:get", "Failed to fetch live status", error);
      throw error;
    }
  }

  async setLiveStatus(eventId: string, isLive: boolean) {
    try {
      logInfo("liveReg:set", `Setting live status to ${isLive} for event ${eventId}`);

      const eventObjectId = new Types.ObjectId(eventId);
      const liveReg = await LiveRegistration.findOneAndUpdate(
        { eventId: eventObjectId },
        { isLive, updatedAt: new Date() },
        { upsert: true, new: true }
      );

      logInfo("liveReg:set", `Live status updated successfully`);
      return liveReg;
    } catch (error) {
      logError("liveReg:set", "Failed to set live status", error);
      throw error;
    }
  }

  async isLive(eventId: string): Promise<boolean> {
    try {
      const status = await this.getLiveStatus(eventId);
      return status.isLive;
    } catch (error) {
      logError("liveReg:isLive", "Failed to check live status", error);
      return false;
    }
  }
}

export const liveRegistrationService = new LiveRegistrationService();
