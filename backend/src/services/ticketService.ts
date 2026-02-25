import { Ticket } from "../db/models/Ticket";
import { logInfo, logWarn } from "../utils/logger";
import { Types } from "mongoose";
import { seatService } from "./seatService";

export const ticketService = {
  async listTickets(eventId: string) {
    try {
      logInfo("ticketService:list", `Listing tickets for ${eventId}`);
      return await Ticket.find({
        eventId: new Types.ObjectId(eventId)
      }).sort({ createdAt: -1 });
    } catch (error) {
      logWarn("ticketService:list", "Failed to list tickets", error);
      throw error;
    }
  },

  async getTicketByCode(eventId: string, ticketCode: string) {
    try {
      logInfo("ticketService:getByCode", `Getting ticket ${ticketCode} for event ${eventId}`);
      return await Ticket.findOne({
        eventId: new Types.ObjectId(eventId),
        ticketCode,
      });
    } catch (error) {
      logWarn("ticketService:getByCode", "Failed to get ticket", error);
      throw error;
    }
  },

  async checkInTicket(ticketCode: string, eventId: string, timestamp: string, scannerId?: string) {
    try {
      logInfo("ticketService:checkIn", `Checking in ticket ${ticketCode}`);
      
      const ticket = await Ticket.findOne({
        eventId: new Types.ObjectId(eventId),
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
          logInfo("ticketService:checkIn", `Resolving conflict: new timestamp earlier for ${ticketCode}`);
          await Ticket.findByIdAndUpdate(ticket._id, {
            checkedInAt: new Date(timestamp),
            checkInTime: new Date(timestamp),
            checkInBy: scannerId || "unknown",
          });

          if (!ticket.seatNumber) {
            await seatService.assignSeat(eventId, String(ticket._id), ticket.name);
          }
          return { conflict: true, resolution: "updated", ticket };
        } else {
          // Existing check-in is earlier, keep it
          logInfo("ticketService:checkIn", `Resolving conflict: keeping existing for ${ticketCode}`);

          if (!ticket.seatNumber) {
            await seatService.assignSeat(eventId, String(ticket._id), ticket.name);
          }
          return { conflict: true, resolution: "kept_existing", ticket };
        }
      }

      // First check-in, simply mark as checked in
      const updatedTicket = await Ticket.findByIdAndUpdate(
        ticket._id,
        {
          checkedIn: true,
          checkedInAt: new Date(timestamp),
          checkInTime: new Date(timestamp),
          checkInBy: scannerId || "unknown",
        },
        { new: true }
      );

      logInfo("ticketService:checkIn", `Ticket ${ticketCode} checked in successfully`);
      if (updatedTicket && !updatedTicket.seatNumber) {
        await seatService.assignSeat(eventId, String(updatedTicket._id), updatedTicket.name);
      }
      return { conflict: false, resolution: "new", ticket: updatedTicket };
    } catch (error) {
      logWarn("ticketService:checkIn", "Failed to check in ticket", error);
      throw error;
    }
  },

  async createTicket(eventId: string, ticketCode: string, ticketType: string, duoParticipants?: any[], name?: string, personalEmail?: string) {
    try {
      logInfo("ticketService:create", `Creating ticket ${ticketCode}`);
      return await Ticket.create({
        eventId: new Types.ObjectId(eventId),
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
    } catch (error) {
      logWarn("ticketService:create", "Failed to create ticket", error);
      throw error;
    }
  },

  async getEventCheckInStats(eventId: string) {
    try {
      logInfo("ticketService:stats", `Getting check-in stats for event ${eventId}`);
      const totalTickets = await Ticket.countDocuments({
        eventId: new Types.ObjectId(eventId),
      });
      const checkedInTickets = await Ticket.countDocuments({
        eventId: new Types.ObjectId(eventId),
        checkedIn: true,
      });
      return {
        total: totalTickets,
        checkedIn: checkedInTickets,
        remaining: totalTickets - checkedInTickets,
      };
    } catch (error) {
      logWarn("ticketService:stats", "Failed to get stats", error);
      throw error;
    }
  },
};
