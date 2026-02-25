"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const eventService_1 = require("../services/eventService");
const importService_1 = require("../services/importService");
const googleSheetsService_1 = require("../services/googleSheetsService");
const syncHistoryService_1 = require("../services/syncHistoryService");
const qrService_1 = require("../services/qrService");
const seatService_1 = require("../services/seatService");
const liveRegistrationService_1 = require("../services/liveRegistrationService");
const ticketService_1 = require("../services/ticketService");
const logger_1 = require("../utils/logger");
exports.eventsRouter = (0, express_1.Router)();
const mapSeat = (seat) => {
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
const createEventSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    slug: zod_1.z.string().min(2),
    date: zod_1.z.string().min(1),
    venue: zod_1.z.string().optional(),
    sheetId: zod_1.z.string().optional(),
});
const updateEventSchema = createEventSchema.partial();
exports.eventsRouter.get("/events", async (_req, res) => {
    try {
        (0, logger_1.logInfo)("events:list", "Fetching events");
        const events = await eventService_1.eventService.listEvents();
        res.json({ events });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:list", "Failed to fetch events", error);
        res.status(500).json({ error: "Failed to fetch events" });
    }
});
exports.eventsRouter.get("/events/:id", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:get", `Fetching event ${eventId}`);
        const event = await eventService_1.eventService.getEvent(eventId);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        res.json({ event });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:get", "Failed to fetch event", error);
        res.status(500).json({ error: "Failed to fetch event" });
    }
});
exports.eventsRouter.get("/events/:id/tickets", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:tickets", `Fetching tickets for ${eventId}`);
        const tickets = await ticketService_1.ticketService.listTickets(eventId);
        const normalized = tickets.map((ticket) => ({
            id: ticket._id,
            eventId: ticket.eventId,
            ticketCode: ticket.ticketCode,
            name: ticket.name,
            personalEmail: ticket.personalEmail,
            ticketType: ticket.ticketType,
            checkedIn: ticket.checkedIn,
            checkedInAt: ticket.checkedInAt || ticket.checkInTime || null,
            createdAt: ticket.createdAt,
            qrData: ticket.qrData || null,
            seatNumber: ticket.seatNumber || null,
        }));
        res.json({ tickets: normalized });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:tickets", "Failed to list tickets", error);
        res.status(500).json({ error: "Failed to list tickets" });
    }
});
exports.eventsRouter.get("/events/:id/public-key", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:publicKey", `Fetching public key for ${eventId}`);
        const event = await eventService_1.eventService.getEvent(eventId);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        res.json({
            eventId: event._id,
            publicKey: event.qrPublicKey,
            name: event.name,
            slug: event.slug,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:publicKey", "Failed to fetch public key", error);
        res.status(500).json({ error: "Failed to fetch public key" });
    }
});
exports.eventsRouter.post("/events", async (req, res) => {
    try {
        const payload = createEventSchema.parse(req.body);
        (0, logger_1.logInfo)("events:create", `Creating event ${payload.slug}`);
        const event = await eventService_1.eventService.createEvent(payload);
        res.status(201).json({ event });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:create", "Failed to create event", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        res.status(500).json({ error: "Failed to create event" });
    }
});
exports.eventsRouter.put("/events/:id", async (req, res) => {
    try {
        const payload = updateEventSchema.parse(req.body);
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:update", `Updating event ${eventId}`);
        const event = await eventService_1.eventService.updateEvent(eventId, payload);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        res.json({ event });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:update", "Failed to update event", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        res.status(500).json({ error: "Failed to update event" });
    }
});
exports.eventsRouter.post("/events/:id/import-csv", async (req, res) => {
    try {
        const eventId = req.params.id;
        const csvText = typeof req.body?.csvText === "string" ? req.body.csvText : "";
        if (!csvText.trim()) {
            return res.status(400).json({ error: "csvText is required" });
        }
        (0, logger_1.logInfo)("events:import", `Importing CSV for event ${eventId}`);
        const result = await importService_1.importService.importTicketsFromCsv(eventId, csvText);
        res.status(201).json({ result });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:import", "Failed to import CSV", error);
        res.status(500).json({ error: "Failed to import CSV" });
    }
});
exports.eventsRouter.post("/events/:id/sync-google-sheet", async (req, res) => {
    try {
        const eventId = req.params.id;
        const body = req.body;
        (0, logger_1.logInfo)("events:syncSheet", `Syncing Google Sheet for event ${eventId}`);
        const event = await eventService_1.eventService.getEvent(eventId);
        if (!event) {
            return res.status(404).json({ error: "Event not found" });
        }
        const sheetId = body.sheetId || event.sheetId;
        if (!sheetId) {
            return res.status(400).json({ error: "sheetId is required" });
        }
        const job = await syncHistoryService_1.syncHistoryService.createJob({
            eventId,
            source: "google_sheets",
            sheetId,
        });
        const sheetResult = await googleSheetsService_1.googleSheetsService.fetchSheetRows(sheetId, body.range);
        const result = await importService_1.importService.importTicketsFromRows(eventId, sheetResult.rows, "sheets");
        await syncHistoryService_1.syncHistoryService.completeJob(job.id, {
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
    }
    catch (error) {
        (0, logger_1.logWarn)("events:syncSheet", "Failed to sync Google Sheet", error);
        if (error instanceof Error) {
            try {
                const jobId = error.jobId;
                if (jobId) {
                    await syncHistoryService_1.syncHistoryService.failJob(jobId, error.message);
                }
            }
            catch (innerError) {
                (0, logger_1.logWarn)("events:syncSheet", "Failed to mark sync job as failed", innerError);
            }
        }
        res.status(500).json({ error: "Failed to sync Google Sheet" });
    }
});
const generateTicketsSchema = zod_1.z.object({
    exp: zod_1.z.number().optional(),
    force: zod_1.z.boolean().optional(),
});
exports.eventsRouter.post("/events/:id/generate-tickets", async (req, res) => {
    try {
        const eventId = req.params.id;
        const payload = generateTicketsSchema.parse(req.body || {});
        (0, logger_1.logInfo)("events:generateTickets", `Generating tickets for ${eventId}`);
        const result = await qrService_1.qrService.generateTicketsForEvent(eventId, payload.exp, payload.force ?? false);
        res.status(201).json({ result });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:generateTickets", "Failed to generate tickets", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        res.status(500).json({ error: "Failed to generate tickets" });
    }
});
exports.eventsRouter.get("/events/:id/sync-history", async (req, res) => {
    try {
        const eventId = req.params.id;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        (0, logger_1.logInfo)("events:syncHistory", `Listing sync history for ${eventId}`);
        const jobs = await syncHistoryService_1.syncHistoryService.listJobs(eventId, Number.isNaN(limit) ? 20 : limit);
        res.json({ jobs });
    }
    catch (error) {
        (0, logger_1.logWarn)("events:syncHistory", "Failed to list sync history", error);
        res.status(500).json({ error: "Failed to list sync history" });
    }
});
// Live Registration Status Routes
exports.eventsRouter.get("/events/:id/live-status", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:liveStatus:get", `Fetching live status for ${eventId}`);
        const status = await liveRegistrationService_1.liveRegistrationService.getLiveStatus(eventId);
        res.json({
            isLive: status.isLive,
            updatedAt: status.updatedAt.toISOString(),
        });
    }
    catch (error) {
        (0, logger_1.logError)("events:liveStatus:get", "Failed to fetch live status", error);
        res.status(500).json({ error: "Failed to fetch live status" });
    }
});
const setLiveStatusSchema = zod_1.z.object({
    isLive: zod_1.z.boolean(),
});
exports.eventsRouter.post("/events/:id/live-status", async (req, res) => {
    try {
        const eventId = req.params.id;
        const payload = setLiveStatusSchema.parse(req.body);
        (0, logger_1.logInfo)("events:liveStatus:set", `Setting live status to ${payload.isLive} for ${eventId}`);
        const status = await liveRegistrationService_1.liveRegistrationService.setLiveStatus(eventId, payload.isLive);
        res.json({
            isLive: status.isLive,
            updatedAt: status.updatedAt.toISOString(),
        });
    }
    catch (error) {
        (0, logger_1.logError)("events:liveStatus:set", "Failed to set live status", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        res.status(500).json({ error: "Failed to set live status" });
    }
});
// Seating Routes
exports.eventsRouter.get("/events/:id/seats", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:seats:list", `Fetching seats for ${eventId}`);
        const seats = await seatService_1.seatService.getSeatsForEvent(eventId);
        res.json({ seats: seats.map(mapSeat) });
    }
    catch (error) {
        (0, logger_1.logError)("events:seats:list", "Failed to fetch seats", error);
        res.status(500).json({ error: "Failed to fetch seats" });
    }
});
exports.eventsRouter.post("/events/:id/seats/:seatId/block", async (req, res) => {
    try {
        const { seatId } = req.params;
        (0, logger_1.logInfo)("events:seats:block", `Blocking seat ${seatId}`);
        const seat = await seatService_1.seatService.blockSeat(seatId);
        res.json({ seat: mapSeat(seat) });
    }
    catch (error) {
        (0, logger_1.logError)("events:seats:block", "Failed to block seat", error);
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to block seat" });
    }
});
exports.eventsRouter.post("/events/:id/seats/:seatId/unblock", async (req, res) => {
    try {
        const { seatId } = req.params;
        (0, logger_1.logInfo)("events:seats:unblock", `Unblocking seat ${seatId}`);
        const seat = await seatService_1.seatService.unblockSeat(seatId);
        res.json({ seat: mapSeat(seat) });
    }
    catch (error) {
        (0, logger_1.logError)("events:seats:unblock", "Failed to unblock seat", error);
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Failed to unblock seat" });
    }
});
exports.eventsRouter.get("/events/:id/seats/statistics", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("events:seats:stats", `Fetching seat statistics for ${eventId}`);
        const stats = await seatService_1.seatService.getSeatStatistics(eventId);
        res.json({ statistics: stats });
    }
    catch (error) {
        (0, logger_1.logError)("events:seats:stats", "Failed to fetch seat statistics", error);
        res.status(500).json({ error: "Failed to fetch seat statistics" });
    }
});
