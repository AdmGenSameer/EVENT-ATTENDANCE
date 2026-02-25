"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scannerRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const eventService_1 = require("../services/eventService");
const ticketService_1 = require("../services/ticketService");
const logger_1 = require("../utils/logger");
exports.scannerRouter = (0, express_1.Router)();
// Public endpoint for scanner sync (no auth required, uses event-specific API key)
exports.scannerRouter.get("/sync/events/:slug/public-key", async (req, res) => {
    try {
        const slug = req.params.slug;
        (0, logger_1.logInfo)("scanner:publicKey", `Fetching public key for slug ${slug}`);
        const event = await eventService_1.eventService.getEventBySlug(slug);
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
        (0, logger_1.logWarn)("scanner:publicKey", "Failed to fetch public key", error);
        res.status(500).json({ error: "Failed to fetch public key" });
    }
});
exports.scannerRouter.get("/sync/events/:id/tickets", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("scanner:tickets", `Syncing tickets for ${eventId}`);
        const tickets = await ticketService_1.ticketService.listTickets(eventId);
        const sanitized = tickets.map((ticket) => ({
            id: ticket._id,
            eventId: ticket.eventId,
            ticketCode: ticket.ticketCode,
            ticketType: ticket.ticketType,
            checkedIn: ticket.checkedIn,
            checkInTime: ticket.checkInTime || ticket.checkedInAt,
            checkedInAt: ticket.checkedInAt || ticket.checkInTime,
        }));
        res.json({ tickets: sanitized });
    }
    catch (error) {
        (0, logger_1.logWarn)("scanner:tickets", "Failed to sync tickets", error);
        res.status(500).json({ error: "Failed to sync tickets" });
    }
});
const checkInSchema = zod_1.z.object({
    ticketCode: zod_1.z.string(),
    timestamp: zod_1.z.string(),
});
exports.scannerRouter.post("/sync/checkins", async (req, res) => {
    try {
        const eventId = req.body.eventId;
        const items = zod_1.z.array(checkInSchema).parse(req.body.items || []);
        (0, logger_1.logInfo)("scanner:checkins", `Processing ${items.length} check-ins`);
        const results = {
            accepted: 0,
            conflicts: 0,
            errors: 0,
            details: [],
        };
        // Process each check-in with conflict resolution
        for (const item of items) {
            try {
                const result = await ticketService_1.ticketService.checkInTicket(item.ticketCode, eventId, item.timestamp, req.body.scannerId || "scanner-device");
                results.accepted++;
                if (result.conflict) {
                    results.conflicts++;
                }
                results.details.push({
                    ticketCode: item.ticketCode,
                    status: "success",
                    conflict: result.conflict,
                    resolution: result.resolution,
                });
            }
            catch (error) {
                results.errors++;
                results.details.push({
                    ticketCode: item.ticketCode,
                    status: "error",
                    error: error.message,
                });
                (0, logger_1.logWarn)("scanner:checkins", `Failed to process ${item.ticketCode}`, error);
            }
        }
        (0, logger_1.logInfo)("scanner:checkins", `Completed: ${results.accepted} accepted, ${results.conflicts} conflicts, ${results.errors} errors`);
        res.json(results);
    }
    catch (error) {
        (0, logger_1.logWarn)("scanner:checkins", "Failed to process check-ins", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.flatten() });
        }
        res.status(500).json({ error: "Failed to process check-ins" });
    }
});
