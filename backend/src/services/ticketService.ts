import { prisma } from "../db/prisma";
import { logInfo, logWarn } from "../utils/logger";

export const ticketService = {
  async listTickets(eventId: string) {
    try {
      logInfo("ticketService:list", `Listing tickets for ${eventId}`);
      return await prisma.ticket.findMany({ where: { eventId }, orderBy: { createdAt: "desc" } });
    } catch (error) {
      logWarn("ticketService:list", "Failed to list tickets", error);
      throw error;
    }
  },

  async checkInTicket(ticketId: string, timestamp: string, scannerId?: string) {
    try {
      logInfo("ticketService:checkIn", `Checking in ticket ${ticketId}`);
      
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      
      if (!ticket) {
        throw new Error("Ticket not found");
      }

      // If already checked in, apply conflict resolution (earliest timestamp wins)
      if (ticket.checkedIn) {
        const existingTimestamp = ticket.checkedInAt ? new Date(ticket.checkedInAt).getTime() : Date.now();
        const newTimestamp = new Date(timestamp).getTime();

        if (newTimestamp < existingTimestamp) {
          // New check-in is earlier, update
          logInfo("ticketService:checkIn", `Resolving conflict: new timestamp earlier for ${ticketId}`);
          await prisma.ticket.update({
            where: { id: ticketId },
            data: {
              checkedInAt: new Date(timestamp),
              checkedInBy: scannerId || "unknown",
            },
          });
          return { conflict: true, resolution: "updated", ticket };
        } else {
          // Existing check-in is earlier, keep it
          logInfo("ticketService:checkIn", `Resolving conflict: keeping existing for ${ticketId}`);
          return { conflict: true, resolution: "kept_existing", ticket };
        }
      }

      // First check-in, simply mark as checked in
      await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          checkedIn: true,
          checkedInAt: new Date(timestamp),
          checkedInBy: scannerId || "unknown",
        },
      });

      logInfo("ticketService:checkIn", `Ticket ${ticketId} checked in successfully`);
      return { conflict: false, resolution: "new", ticket };
    } catch (error) {
      logWarn("ticketService:checkIn", "Failed to check in ticket", error);
      throw error;
    }
  },
};
