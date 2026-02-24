import { Router } from "express";
import { z } from "zod";
import { eventService } from "../services/eventService";
import { ticketService } from "../services/ticketService";
import { logInfo, logWarn } from "../utils/logger";

export const scannerRouter = Router();

// Public endpoint for scanner sync (no auth required, uses event-specific API key)
scannerRouter.get("/sync/events/:slug/public-key", async (req, res) => {
  try {
    const slug = req.params.slug;
    logInfo("scanner:publicKey", `Fetching public key for slug ${slug}`);
    const events = await eventService.listEvents();
    const event = events.find((e: { slug: string; }) => e.slug === slug);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({
      eventId: event.id,
      publicKey: event.publicKey,
      name: event.name,
      slug: event.slug,
    });
  } catch (error) {
    logWarn("scanner:publicKey", "Failed to fetch public key", error);
    res.status(500).json({ error: "Failed to fetch public key" });
  }
});

scannerRouter.get("/sync/events/:id/tickets", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("scanner:tickets", `Syncing tickets for ${eventId}`);
    const tickets = await ticketService.listTickets(eventId);
    const sanitized = tickets.map((ticket: { id: any; eventId: any; ticketCode: any; name: any; ticketType: any; qrData: any; checkedIn: any; checkedInAt: any; }) => ({
      id: ticket.id,
      eventId: ticket.eventId,
      ticketCode: ticket.ticketCode,
      name: ticket.name,
      ticketType: ticket.ticketType,
      qrData: ticket.qrData,
      checkedIn: ticket.checkedIn,
      checkedInAt: ticket.checkedInAt,
    }));
    res.json({ tickets: sanitized });
  } catch (error) {
    logWarn("scanner:tickets", "Failed to sync tickets", error);
    res.status(500).json({ error: "Failed to sync tickets" });
  }
});

const checkInSchema = z.object({
  ticketId: z.string(),
  timestamp: z.string(),
});

scannerRouter.post("/sync/checkins", async (req, res) => {
  try {
    const items = z.array(checkInSchema).parse(req.body.items || []);
    logInfo("scanner:checkins", `Processing ${items.length} check-ins`);
    
    const results = {
      accepted: 0,
      conflicts: 0,
      errors: 0,
      details: [] as any[],
    };

    // Process each check-in with conflict resolution
    for (const item of items) {
      try {
        const result = await ticketService.checkInTicket(
          item.ticketId,
          item.timestamp,
          req.body.scannerId || "scanner-device"
        );
        
        results.accepted++;
        if (result.conflict) {
          results.conflicts++;
        }
        
        results.details.push({
          ticketId: item.ticketId,
          status: "success",
          conflict: result.conflict,
          resolution: result.resolution,
        });
      } catch (error: any) {
        results.errors++;
        results.details.push({
          ticketId: item.ticketId,
          status: "error",
          error: error.message,
        });
        logWarn("scanner:checkins", `Failed to process ${item.ticketId}`, error);
      }
    }

    logInfo("scanner:checkins", `Completed: ${results.accepted} accepted, ${results.conflicts} conflicts, ${results.errors} errors`);
    res.json(results);
  } catch (error) {
    logWarn("scanner:checkins", "Failed to process check-ins", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({ error: "Failed to process check-ins" });
  }
});
