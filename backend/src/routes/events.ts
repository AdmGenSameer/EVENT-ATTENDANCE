import { Router } from "express";
import { z } from "zod";
import { eventService } from "../services/eventService";
import { importService } from "../services/importService";
import { googleSheetsService } from "../services/googleSheetsService";
import { syncHistoryService } from "../services/syncHistoryService";
import { qrService } from "../services/qrService";
import { seatService } from "../services/seatService";
import { liveRegistrationService } from "../services/liveRegistrationService";
import { logInfo, logWarn, logError } from "../utils/logger";

export const eventsRouter = Router();

const mapSeat = (seat: {
  id: string;
  eventId: string;
  section: string;
  row: string;
  number: number;
  seatCode: string;
  status: string;
  ticketId?: string | null;
  participantName?: string | null;
}) => {
  const section = seat.section.toLowerCase();
  const status = seat.status.toLowerCase();

  return {
    id: seat.id,
    eventId: seat.eventId,
    section,
    row: seat.row,
    number: seat.number,
    seatCode: seat.seatCode,
    status,
    ticketId: seat.ticketId ?? null,
    participantName: seat.participantName ?? null,
  };
};

const createEventSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  date: z.string().min(1),
  venue: z.string().optional(),
  sheetId: z.string().optional(),
});

const updateEventSchema = createEventSchema.partial();

eventsRouter.get("/events", async (_req, res) => {
  try {
    logInfo("events:list", "Fetching events");
    const events = await eventService.listEvents();
    res.json({ events });
  } catch (error) {
    logWarn("events:list", "Failed to fetch events", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

eventsRouter.get("/events/:id", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("events:get", `Fetching event ${eventId}`);
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ event });
  } catch (error) {
    logWarn("events:get", "Failed to fetch event", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

eventsRouter.get("/events/:id/public-key", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("events:publicKey", `Fetching public key for ${eventId}`);
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({
      eventId: event._id,
      publicKey: event.qrPublicKey,
      name: event.name,
      slug: event.slug,
    });
  } catch (error) {
    logWarn("events:publicKey", "Failed to fetch public key", error);
    res.status(500).json({ error: "Failed to fetch public key" });
  }
});

eventsRouter.post("/events", async (req, res) => {
  try {
    const payload = createEventSchema.parse(req.body);
    logInfo("events:create", `Creating event ${payload.slug}`);
    const event = await eventService.createEvent(payload);
    res.status(201).json({ event });
  } catch (error) {
    logWarn("events:create", "Failed to create event", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({ error: "Failed to create event" });
  }
});

eventsRouter.put("/events/:id", async (req, res) => {
  try {
    const payload = updateEventSchema.parse(req.body);
    const eventId = req.params.id;
    logInfo("events:update", `Updating event ${eventId}`);
    const event = await eventService.updateEvent(eventId, payload);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.json({ event });
  } catch (error) {
    logWarn("events:update", "Failed to update event", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({ error: "Failed to update event" });
  }
});

eventsRouter.post("/events/:id/import-csv", async (req, res) => {
  try {
    const eventId = req.params.id;
    const csvText = typeof req.body?.csvText === "string" ? req.body.csvText : "";
    if (!csvText.trim()) {
      return res.status(400).json({ error: "csvText is required" });
    }
    logInfo("events:import", `Importing CSV for event ${eventId}`);
    const result = await importService.importTicketsFromCsv(eventId, csvText);
    res.status(201).json({ result });
  } catch (error) {
    logWarn("events:import", "Failed to import CSV", error);
    res.status(500).json({ error: "Failed to import CSV" });
  }
});

eventsRouter.post("/events/:id/sync-google-sheet", async (req, res) => {
  try {
    const eventId = req.params.id;
    const body = req.body as { sheetId?: string; range?: string };
    logInfo("events:syncSheet", `Syncing Google Sheet for event ${eventId}`);
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const sheetId = body.sheetId || event.sheetId;
    if (!sheetId) {
      return res.status(400).json({ error: "sheetId is required" });
    }

    const job = await syncHistoryService.createJob({
      eventId,
      source: "google_sheets",
      sheetId,
    });

    const sheetResult = await googleSheetsService.fetchSheetRows(sheetId, body.range);
    const result = await importService.importTicketsFromRows(eventId, sheetResult.rows, "sheets");
    await syncHistoryService.completeJob(job.id, {
      status: "completed",
      imported: result.imported,
      skipped: result.skipped,
      errorCount: result.errors.length,
      errors: result.errors,
      rowCount: sheetResult.rows.length,
      totalRows: sheetResult.totalRows,
      truncated: sheetResult.truncated,
    });
    res.status(201).json({
      result,
      rowCount: sheetResult.rows.length,
      totalRows: sheetResult.totalRows,
      truncated: sheetResult.truncated,
    });
  } catch (error) {
    logWarn("events:syncSheet", "Failed to sync Google Sheet", error);
    if (error instanceof Error) {
      try {
        const jobId = (error as { jobId?: string }).jobId;
        if (jobId) {
          await syncHistoryService.failJob(jobId, error.message);
        }
      } catch (innerError) {
        logWarn("events:syncSheet", "Failed to mark sync job as failed", innerError);
      }
    }
    res.status(500).json({ error: "Failed to sync Google Sheet" });
  }
});

const generateTicketsSchema = z.object({
  exp: z.number().optional(),
  force: z.boolean().optional(),
});

eventsRouter.post("/events/:id/generate-tickets", async (req, res) => {
  try {
    const eventId = req.params.id;
    const payload = generateTicketsSchema.parse(req.body || {});
    logInfo("events:generateTickets", `Generating tickets for ${eventId}`);
    const result = await qrService.generateTicketsForEvent(eventId, payload.exp, payload.force ?? false);
    res.status(201).json({ result });
  } catch (error) {
    logWarn("events:generateTickets", "Failed to generate tickets", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({ error: "Failed to generate tickets" });
  }
});

eventsRouter.get("/events/:id/sync-history", async (req, res) => {
  try {
    const eventId = req.params.id;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    logInfo("events:syncHistory", `Listing sync history for ${eventId}`);
    const jobs = await syncHistoryService.listJobs(eventId, Number.isNaN(limit) ? 20 : limit);
    res.json({ jobs });
  } catch (error) {
    logWarn("events:syncHistory", "Failed to list sync history", error);
    res.status(500).json({ error: "Failed to list sync history" });
  }
});

// Live Registration Status Routes
eventsRouter.get("/events/:id/live-status", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("events:liveStatus:get", `Fetching live status for ${eventId}`);
    
    const status = await liveRegistrationService.getLiveStatus(eventId);
    res.json({
      isLive: status.isLive,
      updatedAt: status.updatedAt.toISOString(),
    });
  } catch (error) {
    logError("events:liveStatus:get", "Failed to fetch live status", error);
    res.status(500).json({ error: "Failed to fetch live status" });
  }
});

const setLiveStatusSchema = z.object({
  isLive: z.boolean(),
});

eventsRouter.post("/events/:id/live-status", async (req, res) => {
  try {
    const eventId = req.params.id;
    const payload = setLiveStatusSchema.parse(req.body);
    logInfo("events:liveStatus:set", `Setting live status to ${payload.isLive} for ${eventId}`);
    
    const status = await liveRegistrationService.setLiveStatus(eventId, payload.isLive);
    res.json({
      isLive: status.isLive,
      updatedAt: status.updatedAt.toISOString(),
    });
  } catch (error) {
    logError("events:liveStatus:set", "Failed to set live status", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.flatten() });
    }
    res.status(500).json({ error: "Failed to set live status" });
  }
});

// Seating Routes
eventsRouter.get("/events/:id/seats", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("events:seats:list", `Fetching seats for ${eventId}`);
    
    const seats = await seatService.getSeatsForEvent(eventId);
    res.json({ seats: seats.map(mapSeat) });
  } catch (error) {
    logError("events:seats:list", "Failed to fetch seats", error);
    res.status(500).json({ error: "Failed to fetch seats" });
  }
});

eventsRouter.post("/events/:id/seats/:seatId/block", async (req, res) => {
  try {
    const { seatId } = req.params;
    logInfo("events:seats:block", `Blocking seat ${seatId}`);
    
    const seat = await seatService.blockSeat(seatId);
    res.json({ seat: mapSeat(seat) });
  } catch (error) {
    logError("events:seats:block", "Failed to block seat", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to block seat" });
  }
});

eventsRouter.post("/events/:id/seats/:seatId/unblock", async (req, res) => {
  try {
    const { seatId } = req.params;
    logInfo("events:seats:unblock", `Unblocking seat ${seatId}`);
    
    const seat = await seatService.unblockSeat(seatId);
    res.json({ seat: mapSeat(seat) });
  } catch (error) {
    logError("events:seats:unblock", "Failed to unblock seat", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to unblock seat" });
  }
});

eventsRouter.get("/events/:id/seats/statistics", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("events:seats:stats", `Fetching seat statistics for ${eventId}`);
    
    const stats = await seatService.getSeatStatistics(eventId);
    res.json({ statistics: stats });
  } catch (error) {
    logError("events:seats:stats", "Failed to fetch seat statistics", error);
    res.status(500).json({ error: "Failed to fetch seat statistics" });
  }
});
