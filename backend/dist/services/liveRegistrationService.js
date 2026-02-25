"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.liveRegistrationService = exports.LiveRegistrationService = void 0;
const mongoose_1 = require("mongoose");
const LiveRegistration_1 = require("../db/models/LiveRegistration");
const logger_1 = require("../utils/logger");
class LiveRegistrationService {
    async getLiveStatus(eventId) {
        try {
            (0, logger_1.logInfo)("liveReg:get", `Fetching live status for event ${eventId}`);
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            let liveReg = await LiveRegistration_1.LiveRegistration.findOne({ eventId: eventObjectId });
            // Initialize if doesn't exist
            if (!liveReg) {
                liveReg = await LiveRegistration_1.LiveRegistration.create({
                    eventId: eventObjectId,
                    isLive: false,
                });
                (0, logger_1.logInfo)("liveReg:get", `Initialized live registration for event ${eventId}`);
            }
            return liveReg;
        }
        catch (error) {
            (0, logger_1.logError)("liveReg:get", "Failed to fetch live status", error);
            throw error;
        }
    }
    async setLiveStatus(eventId, isLive) {
        try {
            (0, logger_1.logInfo)("liveReg:set", `Setting live status to ${isLive} for event ${eventId}`);
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            const liveReg = await LiveRegistration_1.LiveRegistration.findOneAndUpdate({ eventId: eventObjectId }, { isLive, updatedAt: new Date() }, { upsert: true, new: true });
            (0, logger_1.logInfo)("liveReg:set", `Live status updated successfully`);
            return liveReg;
        }
        catch (error) {
            (0, logger_1.logError)("liveReg:set", "Failed to set live status", error);
            throw error;
        }
    }
    async isLive(eventId) {
        try {
            const status = await this.getLiveStatus(eventId);
            return status.isLive;
        }
        catch (error) {
            (0, logger_1.logError)("liveReg:isLive", "Failed to check live status", error);
            return false;
        }
    }
}
exports.LiveRegistrationService = LiveRegistrationService;
exports.liveRegistrationService = new LiveRegistrationService();
