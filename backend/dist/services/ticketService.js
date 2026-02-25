"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketService = void 0;
const Ticket_1 = require("../db/models/Ticket");
const logger_1 = require("../utils/logger");
const mongoose_1 = require("mongoose");
const seatService_1 = require("./seatService");
exports.ticketService = {
    async listTickets(eventId) {
        try {
            (0, logger_1.logInfo)("ticketService:list", `Listing tickets for ${eventId}`);
            return await Ticket_1.Ticket.find({
                eventId: new mongoose_1.Types.ObjectId(eventId)
            }).sort({ createdAt: -1 });
        }
        catch (error) {
            (0, logger_1.logWarn)("ticketService:list", "Failed to list tickets", error);
            throw error;
        }
    },
    async getTicketByCode(eventId, ticketCode) {
        try {
            (0, logger_1.logInfo)("ticketService:getByCode", `Getting ticket ${ticketCode} for event ${eventId}`);
            return await Ticket_1.Ticket.findOne({
                eventId: new mongoose_1.Types.ObjectId(eventId),
                ticketCode,
            });
        }
        catch (error) {
            (0, logger_1.logWarn)("ticketService:getByCode", "Failed to get ticket", error);
            throw error;
        }
    },
    async checkInTicket(ticketCode, eventId, timestamp, scannerId) {
        try {
            (0, logger_1.logInfo)("ticketService:checkIn", `Checking in ticket ${ticketCode}`);
            const ticket = await Ticket_1.Ticket.findOne({
                eventId: new mongoose_1.Types.ObjectId(eventId),
                ticketCode,
            });
            if (!ticket) {
                throw new Error("Ticket not found");
            }
            // If already checked in, apply conflict resolution (earliest timestamp wins)
            if (ticket.checkedIn) {
                const existingTimestamp = ticket.checkedInAt ? new Date(ticket.checkedInAt).getTime() : Date.now();
                const newTimestamp = new Date(timestamp).getTime();
                if (newTimestamp < existingTimestamp) {
                    // New check-in is earlier, update
                    (0, logger_1.logInfo)("ticketService:checkIn", `Resolving conflict: new timestamp earlier for ${ticketCode}`);
                    await Ticket_1.Ticket.findByIdAndUpdate(ticket._id, {
                        checkedInAt: new Date(timestamp),
                        checkInTime: new Date(timestamp),
                        checkInBy: scannerId || "unknown",
                    });
                    if (!ticket.seatNumber) {
                        await seatService_1.seatService.assignSeat(eventId, String(ticket._id), ticket.name);
                    }
                    return { conflict: true, resolution: "updated", ticket };
                }
                else {
                    // Existing check-in is earlier, keep it
                    (0, logger_1.logInfo)("ticketService:checkIn", `Resolving conflict: keeping existing for ${ticketCode}`);
                    if (!ticket.seatNumber) {
                        await seatService_1.seatService.assignSeat(eventId, String(ticket._id), ticket.name);
                    }
                    return { conflict: true, resolution: "kept_existing", ticket };
                }
            }
            // First check-in, simply mark as checked in
            const updatedTicket = await Ticket_1.Ticket.findByIdAndUpdate(ticket._id, {
                checkedIn: true,
                checkedInAt: new Date(timestamp),
                checkInTime: new Date(timestamp),
                checkInBy: scannerId || "unknown",
            }, { new: true });
            (0, logger_1.logInfo)("ticketService:checkIn", `Ticket ${ticketCode} checked in successfully`);
            if (updatedTicket && !updatedTicket.seatNumber) {
                await seatService_1.seatService.assignSeat(eventId, String(updatedTicket._id), updatedTicket.name);
            }
            return { conflict: false, resolution: "new", ticket: updatedTicket };
        }
        catch (error) {
            (0, logger_1.logWarn)("ticketService:checkIn", "Failed to check in ticket", error);
            throw error;
        }
    },
    async createTicket(eventId, ticketCode, ticketType, duoParticipants, name, personalEmail) {
        try {
            (0, logger_1.logInfo)("ticketService:create", `Creating ticket ${ticketCode}`);
            return await Ticket_1.Ticket.create({
                eventId: new mongoose_1.Types.ObjectId(eventId),
                ticketCode,
                ticketType,
                name: name || "",
                personalEmail: personalEmail || "",
                duoParticipants: duoParticipants || [],
                checkedIn: false,
                checkedInAt: null,
                checkInTime: null,
                checkInBy: null,
            });
        }
        catch (error) {
            (0, logger_1.logWarn)("ticketService:create", "Failed to create ticket", error);
            throw error;
        }
    },
    async getEventCheckInStats(eventId) {
        try {
            (0, logger_1.logInfo)("ticketService:stats", `Getting check-in stats for event ${eventId}`);
            const totalTickets = await Ticket_1.Ticket.countDocuments({
                eventId: new mongoose_1.Types.ObjectId(eventId),
            });
            const checkedInTickets = await Ticket_1.Ticket.countDocuments({
                eventId: new mongoose_1.Types.ObjectId(eventId),
                checkedIn: true,
            });
            return {
                total: totalTickets,
                checkedIn: checkedInTickets,
                remaining: totalTickets - checkedInTickets,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("ticketService:stats", "Failed to get stats", error);
            throw error;
        }
    },
};
