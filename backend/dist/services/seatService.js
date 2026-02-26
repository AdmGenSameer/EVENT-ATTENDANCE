"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seatService = exports.SeatService = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Seat_1 = require("../db/models/Seat");
const Ticket_1 = require("../db/models/Ticket");
const logger_1 = require("../utils/logger");
const SEAT_CONFIG = {
    FRONT: { prefix: "F", rows: ["A", "B", "C", "D", "E"], seatsPerRow: 15 },
    REAR: {
        prefix: "R",
        rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"],
        seatsPerRow: 15,
    },
    BALCONY: { prefix: "B", rows: ["A", "B", "C", "D"], seatsPerRow: 15 },
};
class SeatService {
    async initializeSeatsForEvent(eventId) {
        try {
            (0, logger_1.logInfo)("seatService:init", `Initializing seats for event ${eventId}`);
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            const existingSeats = await Seat_1.Seat.countDocuments({ eventId: eventObjectId });
            if (existingSeats > 0) {
                (0, logger_1.logInfo)("seatService:init", `Seats already initialized for event ${eventId}`);
                return;
            }
            const seats = [];
            for (const [section, config] of Object.entries(SEAT_CONFIG)) {
                for (const row of config.rows) {
                    for (let number = 1; number <= config.seatsPerRow; number++) {
                        seats.push({
                            eventId: eventObjectId,
                            section: section,
                            row,
                            number,
                            seatCode: `${config.prefix}${row}${number}`,
                            status: "AVAILABLE",
                        });
                    }
                }
            }
            await Seat_1.Seat.insertMany(seats);
            (0, logger_1.logInfo)("seatService:init", `Created ${seats.length} seats for event ${eventId}`);
        }
        catch (error) {
            (0, logger_1.logError)("seatService:init", "Failed to initialize seats", error);
            throw error;
        }
    }
    async getSeatsForEvent(eventId) {
        try {
            (0, logger_1.logInfo)("seatService:list", `Fetching seats for event ${eventId}`);
            // Ensure seats are initialized
            await this.initializeSeatsForEvent(eventId);
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            const seats = await Seat_1.Seat.find({ eventId: eventObjectId }).sort({ section: 1, row: 1, number: 1 });
            (0, logger_1.logInfo)("seatService:list", `Found ${seats.length} seats`);
            return seats;
        }
        catch (error) {
            (0, logger_1.logError)("seatService:list", "Failed to fetch seats", error);
            throw error;
        }
    }
    async getSeat(seatId) {
        try {
            const seat = await Seat_1.Seat.findById(seatId);
            return seat;
        }
        catch (error) {
            (0, logger_1.logError)("seatService:get", "Failed to fetch seat", error);
            throw error;
        }
    }
    async blockSeat(seatId) {
        try {
            (0, logger_1.logInfo)("seatService:block", `Blocking seat ${seatId}`);
            const seat = await Seat_1.Seat.findById(seatId);
            if (!seat) {
                throw new Error("Seat not found");
            }
            if (seat.status === "ASSIGNED") {
                throw new Error("Cannot block an assigned seat");
            }
            seat.status = "BLOCKED";
            const updated = await seat.save();
            (0, logger_1.logInfo)("seatService:block", `Seat ${seatId} blocked successfully`);
            return updated;
        }
        catch (error) {
            (0, logger_1.logError)("seatService:block", "Failed to block seat", error);
            throw error;
        }
    }
    async unblockSeat(seatId) {
        try {
            (0, logger_1.logInfo)("seatService:unblock", `Unblocking seat ${seatId}`);
            const seat = await Seat_1.Seat.findById(seatId);
            if (!seat) {
                throw new Error("Seat not found");
            }
            seat.status = "AVAILABLE";
            seat.ticketId = null;
            seat.participantName = null;
            seat.assignedAt = null;
            const updated = await seat.save();
            (0, logger_1.logInfo)("seatService:unblock", `Seat ${seatId} unblocked successfully`);
            return updated;
        }
        catch (error) {
            (0, logger_1.logError)("seatService:unblock", "Failed to unblock seat", error);
            throw error;
        }
    }
    async assignSeat(eventId, ticketId, participantName) {
        try {
            (0, logger_1.logInfo)("seatService:assign", `Assigning seat for ticket ${ticketId}`);
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            const ticketObjectId = new mongoose_1.Types.ObjectId(ticketId);
            const session = await mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const availableSeat = await Seat_1.Seat.findOneAndUpdate({ eventId: eventObjectId, status: "AVAILABLE" }, {
                    status: "ASSIGNED",
                    ticketId: ticketObjectId,
                    participantName,
                    assignedAt: new Date(),
                }, {
                    sort: { section: 1, row: 1, number: 1 },
                    new: true,
                    session,
                });
                if (!availableSeat) {
                    (0, logger_1.logWarn)("seatService:assign", "No available seats");
                    await session.abortTransaction();
                    session.endSession();
                    return null;
                }
                await Ticket_1.Ticket.findByIdAndUpdate(ticketObjectId, { seatNumber: availableSeat.seatCode }, { session });
                await session.commitTransaction();
                session.endSession();
                (0, logger_1.logInfo)("seatService:assign", `Assigned seat ${availableSeat.seatCode} to ticket ${ticketId}`);
                return availableSeat;
            }
            catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }
        }
        catch (error) {
            (0, logger_1.logError)("seatService:assign", "Failed to assign seat", error);
            throw error;
        }
    }
    async assignSpecificSeat(eventId, ticketId, participantName, seatCode) {
        try {
            (0, logger_1.logInfo)("seatService:assignSpecific", `Assigning specific seat ${seatCode} for ticket ${ticketId}`);
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            const ticketObjectId = new mongoose_1.Types.ObjectId(ticketId);
            // Clean up seat code format - mobile sends "F-A-01" but we store "FA1" or "FA01"
            const cleanSeatCode = seatCode.replace(/-/g, '').replace(/^([A-Z])([A-Z])0*/, '$1$2');
            const session = await mongoose_1.default.startSession();
            session.startTransaction();
            try {
                // Try to find and assign the specific seat
                const specificSeat = await Seat_1.Seat.findOneAndUpdate({
                    eventId: eventObjectId,
                    seatCode: { $in: [seatCode, cleanSeatCode] }, // Try both formats
                    status: { $in: ["AVAILABLE", "BLOCKED"] } // Allow assigning blocked seats if mobile device already assigned
                }, {
                    status: "ASSIGNED",
                    ticketId: ticketObjectId,
                    participantName,
                    assignedAt: new Date(),
                }, {
                    new: true,
                    session,
                });
                if (!specificSeat) {
                    // Seat not found or already assigned, fall back to any available seat
                    (0, logger_1.logWarn)("seatService:assignSpecific", `Seat ${seatCode} not available, assigning next available`);
                    await session.abortTransaction();
                    session.endSession();
                    return await this.assignSeat(eventId, ticketId, participantName);
                }
                await Ticket_1.Ticket.findByIdAndUpdate(ticketObjectId, { seatNumber: specificSeat.seatCode }, { session });
                await session.commitTransaction();
                session.endSession();
                (0, logger_1.logInfo)("seatService:assignSpecific", `Assigned specific seat ${specificSeat.seatCode} to ticket ${ticketId}`);
                return specificSeat;
            }
            catch (error) {
                await session.abortTransaction();
                session.endSession();
                throw error;
            }
        }
        catch (error) {
            (0, logger_1.logError)("seatService:assignSpecific", "Failed to assign specific seat", error);
            throw error;
        }
    }
    async getSeatStatistics(eventId) {
        try {
            const eventObjectId = new mongoose_1.Types.ObjectId(eventId);
            const stats = await Seat_1.Seat.aggregate([
                { $match: { eventId: eventObjectId } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]);
            const lookup = (status) => stats.find((s) => s._id === status)?.count || 0;
            const available = lookup("AVAILABLE");
            const assigned = lookup("ASSIGNED");
            const blocked = lookup("BLOCKED");
            return {
                total: available + assigned + blocked,
                available,
                assigned,
                blocked,
            };
        }
        catch (error) {
            (0, logger_1.logError)("seatService:stats", "Failed to fetch seat statistics", error);
            throw error;
        }
    }
}
exports.SeatService = SeatService;
exports.seatService = new SeatService();
