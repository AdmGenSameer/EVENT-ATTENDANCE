import mongoose, { Types } from "mongoose";
import { Seat, SeatSection, SeatStatus } from "../db/models/Seat";
import { Ticket } from "../db/models/Ticket";
import { logInfo, logWarn, logError } from "../utils/logger";

const SEAT_CONFIG = {
  FRONT: { prefix: "F", rows: ["A", "B", "C", "D", "E"], seatsPerRow: 15 },
  REAR: {
    prefix: "R",
    rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"],
    seatsPerRow: 15,
  },
  BALCONY: { prefix: "B", rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], seatsPerRow: 15 },
};

export class SeatService {
  async initializeSeatsForEvent(eventId: string) {
    try {
      logInfo("seatService:init", `Initializing seats for event ${eventId}`);

      const eventObjectId = new Types.ObjectId(eventId);
      const existingSeats = await Seat.countDocuments({ eventId: eventObjectId });
      if (existingSeats > 0) {
        logInfo("seatService:init", `Seats already initialized for event ${eventId}`);
        return;
      }

      const seats: Array<{
        eventId: Types.ObjectId;
        section: SeatSection;
        row: string;
        number: number;
        seatCode: string;
        status: SeatStatus;
      }> = [];
      for (const [section, config] of Object.entries(SEAT_CONFIG)) {
        for (const row of config.rows) {
          for (let number = 1; number <= config.seatsPerRow; number++) {
            seats.push({
              eventId: eventObjectId,
              section: section as SeatSection,
              row,
              number,
              seatCode: `${config.prefix}${row}${number}`,
              status: "AVAILABLE" as SeatStatus,
            });
          }
        }
      }

      await Seat.insertMany(seats);
      logInfo("seatService:init", `Created ${seats.length} seats for event ${eventId}`);
    } catch (error) {
      logError("seatService:init", "Failed to initialize seats", error);
      throw error;
    }
  }

  async getSeatsForEvent(eventId: string) {
    try {
      logInfo("seatService:list", `Fetching seats for event ${eventId}`);

      // Ensure seats are initialized
      await this.initializeSeatsForEvent(eventId);

      const eventObjectId = new Types.ObjectId(eventId);
      const seats = await Seat.find({ eventId: eventObjectId }).sort({ section: 1, row: 1, number: 1 });

      logInfo("seatService:list", `Found ${seats.length} seats`);
      return seats;
    } catch (error) {
      logError("seatService:list", "Failed to fetch seats", error);
      throw error;
    }
  }

  async getSeat(seatId: string) {
    try {
      const seat = await Seat.findById(seatId);
      return seat;
    } catch (error) {
      logError("seatService:get", "Failed to fetch seat", error);
      throw error;
    }
  }

  async blockSeat(seatId: string) {
    try {
      logInfo("seatService:block", `Blocking seat ${seatId}`);

      const seat = await Seat.findById(seatId);
      if (!seat) {
        throw new Error("Seat not found");
      }

      if (seat.status === "ASSIGNED") {
        throw new Error("Cannot block an assigned seat");
      }

      seat.status = "BLOCKED";
      const updated = await seat.save();

      logInfo("seatService:block", `Seat ${seatId} blocked successfully`);
      return updated;
    } catch (error) {
      logError("seatService:block", "Failed to block seat", error);
      throw error;
    }
  }

  async unblockSeat(seatId: string) {
    try {
      logInfo("seatService:unblock", `Unblocking seat ${seatId}`);

      const seat = await Seat.findById(seatId);
      if (!seat) {
        throw new Error("Seat not found");
      }

      seat.status = "AVAILABLE";
      seat.ticketId = null;
      seat.participantName = null;
      seat.assignedAt = null;
      const updated = await seat.save();

      logInfo("seatService:unblock", `Seat ${seatId} unblocked successfully`);
      return updated;
    } catch (error) {
      logError("seatService:unblock", "Failed to unblock seat", error);
      throw error;
    }
  }

  async assignSeat(eventId: string, ticketId: string, participantName: string) {
    try {
      logInfo("seatService:assign", `Assigning seat for ticket ${ticketId}`);

      const eventObjectId = new Types.ObjectId(eventId);
      const ticketObjectId = new Types.ObjectId(ticketId);

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const availableSeat = await Seat.findOneAndUpdate(
          { eventId: eventObjectId, status: "AVAILABLE" },
          {
            status: "ASSIGNED",
            ticketId: ticketObjectId,
            participantName,
            assignedAt: new Date(),
          },
          {
            sort: { section: 1, row: 1, number: 1 },
            new: true,
            session,
          }
        );

        if (!availableSeat) {
          logWarn("seatService:assign", "No available seats");
          await session.abortTransaction();
          session.endSession();
          return null;
        }

        await Ticket.findByIdAndUpdate(
          ticketObjectId,
          { seatNumber: availableSeat.seatCode },
          { session }
        );

        await session.commitTransaction();
        session.endSession();

        logInfo("seatService:assign", `Assigned seat ${availableSeat.seatCode} to ticket ${ticketId}`);
        return availableSeat;
      } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
      }

    } catch (error) {
      logError("seatService:assign", "Failed to assign seat", error);
      throw error;
    }
  }

  async getSeatStatistics(eventId: string) {
    try {
      const eventObjectId = new Types.ObjectId(eventId);
      const stats = await Seat.aggregate([
        { $match: { eventId: eventObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      const lookup = (status: SeatStatus) => stats.find((s: { _id: SeatStatus; count: number }) => s._id === status)?.count || 0;

      const available = lookup("AVAILABLE");
      const assigned = lookup("ASSIGNED");
      const blocked = lookup("BLOCKED");

      return {
        total: available + assigned + blocked,
        available,
        assigned,
        blocked,
      };
    } catch (error) {
      logError("seatService:stats", "Failed to fetch seat statistics", error);
      throw error;
    }
  }
}

export const seatService = new SeatService();
