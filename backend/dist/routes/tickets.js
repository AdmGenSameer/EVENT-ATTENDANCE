"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketsRouter = void 0;
const express_1 = require("express");
const ticketService_1 = require("../services/ticketService");
const importService_1 = require("../services/importService");
const qrService_1 = require("../services/qrService");
const googleSheetsService_1 = require("../services/googleSheetsService");
const logger_1 = require("../utils/logger");
const multer_1 = __importDefault(require("multer"));
const Ticket_1 = require("../db/models/Ticket");
exports.ticketsRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// GET /api/tickets/:regNo
// Fetch ticket by registration number (path parameter)
exports.ticketsRouter.get("/:regNo", async (req, res) => {
    try {
        let { regNo } = req.params;
        regNo = regNo.toUpperCase();
        const participant = await Ticket_1.Ticket.findOne({
            registrationNo: regNo,
        }).lean();
        console.log("Fetched participant for regNo:", regNo, participant);
        if (!participant) {
            return res.status(404).json({
                success: false,
                error: "Participant not found",
            });
        }
        // Map duo participants
        const duo = participant.duoParticipants?.map(d => ({
            participantNumber: d.participantNumber,
            name: d.fullName,
            status: d.status,
        }));
        res.status(200).json({
            success: true,
            participant: {
                name: participant.name,
                personalEmail: participant.personalEmail,
                registrationNo: participant.registrationNo,
                contactNo: participant.contactNo,
                ticketType: participant.ticketType,
                checkedIn: participant.checkedIn,
                checkedInAt: participant.checkedInAt || participant.checkInTime || null,
                seatNumber: participant.seatNumber || null,
                duo: duo && duo.length ? duo[0] : null,
            },
            qrCode: participant.qrData || null,
        });
    }
    catch (error) {
        console.error("Error fetching participant:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch participant",
        });
    }
});
// GET /api/tickets/fetch?email=...
// Fetch ticket by email
exports.ticketsRouter.get("/fetch", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email)
            return res.status(400).json({ success: false, error: "Email required" });
        const participant = await Ticket_1.Ticket.findOne({
            personalEmail: email.toLowerCase().trim(),
        }).lean();
        if (!participant)
            return res.status(404).json({ success: false, error: "Participant not found" });
        const duo = participant.duoParticipants?.map(d => ({
            participantNumber: d.participantNumber,
            name: d.fullName,
            status: d.status,
        }));
        res.json({
            success: true,
            participant: {
                name: participant.name,
                personalEmail: participant.personalEmail,
                registrationNo: participant.registrationNo,
                contactNo: participant.contactNo,
                ticketType: participant.ticketType,
                checkedIn: participant.checkedIn,
                checkedInAt: participant.checkedInAt || participant.checkInTime || null,
                seatNumber: participant.seatNumber || null,
                duo: duo && duo.length ? duo[0] : null,
            },
            qrCode: participant.qrData || null,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to fetch participant" });
    }
});
// GET /api/tickets/fetch-by-reg?regNo=...
// Fetch ticket by registration number (query parameter)
exports.ticketsRouter.get("/fetch-by-reg", async (req, res) => {
    try {
        const { regNo } = req.query;
        if (!regNo)
            return res.status(400).json({ success: false, error: "Registration number required" });
        const participant = await Ticket_1.Ticket.findOne({
            registrationNo: regNo.trim(),
        }).lean();
        if (!participant)
            return res.status(404).json({ success: false, error: "Participant not found" });
        const duo = participant.duoParticipants?.map(d => ({
            participantNumber: d.participantNumber,
            name: d.fullName,
            status: d.status,
        }));
        res.json({
            success: true,
            participant: {
                name: participant.name,
                personalEmail: participant.personalEmail,
                registrationNo: participant.registrationNo,
                contactNo: participant.contactNo,
                ticketType: participant.ticketType,
                ticketCode: participant.ticketCode,
                checkedIn: participant.checkedIn,
                checkedInAt: participant.checkedInAt || participant.checkInTime || null,
                seatNumber: participant.seatNumber || null,
                duo: duo && duo.length ? duo[0] : null,
            },
            qrCode: participant.qrData || null,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to fetch participant" });
    }
});
exports.ticketsRouter.get("/events/:id/tickets", async (req, res) => {
    try {
        const eventId = req.params.id;
        (0, logger_1.logInfo)("tickets:list", `Fetching tickets for ${eventId}`);
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
            registrationNo: ticket.registrationNo || null,
            contactNo: ticket.contactNo || null,
        }));
        res.json({ tickets: normalized });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:list", "Failed to list tickets", error);
        res.status(500).json({ error: "Failed to list tickets" });
    }
});
/**
 * POST /api/tickets/import
 * Upload CSV/Excel file with participant data
 * Supports: registration sheet format
 */
exports.ticketsRouter.post("/import", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file provided" });
        }
        const eventId = req.body.eventId;
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        (0, logger_1.logInfo)("tickets:import", `Importing file for event ${eventId}`);
        // Convert buffer to CSV text
        const csvText = req.file.buffer.toString("utf-8");
        // Parse and import
        const result = await importService_1.importService.importTicketsFromCsv(eventId, csvText);
        (0, logger_1.logInfo)("tickets:import", `Import result: ${result.imported} imported, ${result.skipped} skipped`);
        res.json({
            success: true,
            imported: result.imported,
            skipped: result.skipped,
            errors: result.errors,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:import", "Import failed", error);
        res.status(500).json({
            error: "Import failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * POST /api/tickets/add-participant
 * Add a single participant manually
 */
exports.ticketsRouter.post("/add-participant", async (req, res) => {
    try {
        const { eventId, name, email, ticketType, duo } = req.body;
        if (!eventId || !name || !email || !ticketType) {
            return res.status(400).json({
                error: "Missing required fields: eventId, name, email, ticketType",
            });
        }
        (0, logger_1.logInfo)("tickets:add-participant", `Adding participant ${name} for event ${eventId}`);
        const result = await importService_1.importService.addParticipant(eventId, {
            name,
            email,
            ticketType,
            duo,
        });
        res.json({
            success: true,
            ticketId: result.ticketId,
            ticketCode: result.ticketCode,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:add-participant", "Failed to add participant", error);
        res.status(500).json({
            error: "Failed to add participant",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * POST /api/events/:id/qr/generate-single
 * Generate QR for a single ticket
 */
exports.ticketsRouter.post("/events/:eventId/qr/generate-single", async (req, res) => {
    try {
        const { ticketId } = req.body;
        if (!ticketId) {
            return res.status(400).json({ error: "Ticket ID is required" });
        }
        (0, logger_1.logInfo)("tickets:qr-single", `Generating QR for ticket ${ticketId}`);
        const result = await qrService_1.qrService.generateSingleQR(ticketId);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:qr-single", "Failed to generate QR", error);
        res.status(500).json({
            error: "Failed to generate QR",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * POST /api/events/:id/qr/generate-bulk
 * Generate QRs for all tickets in an event (bulk operation)
 */
exports.ticketsRouter.post("/events/:eventId/qr/generate-bulk", async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        (0, logger_1.logInfo)("tickets:qr-bulk", `Starting bulk QR generation for event ${eventId}`);
        const result = await qrService_1.qrService.generateBulkQRs(eventId);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:qr-bulk", "Bulk QR generation failed", error);
        res.status(500).json({
            error: "Bulk QR generation failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * POST /api/tickets/events/:eventId/qr/clear
 * Clear QR data for all tickets in an event
 */
exports.ticketsRouter.post("/events/:eventId/qr/clear", async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        (0, logger_1.logInfo)("tickets:qr-clear", `Clearing QR data for event ${eventId}`);
        const result = await qrService_1.qrService.clearEventQrData(eventId);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:qr-clear", "Clear QR data failed", error);
        res.status(500).json({
            error: "Clear QR data failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * GET /api/events/:id/qr/public-key
 * Get the event's public key for QR verification
 * Used by scanner app to verify QR signatures offline
 */
exports.ticketsRouter.get("/events/:eventId/qr/public-key", async (req, res) => {
    try {
        const { eventId } = req.params;
        if (!eventId) {
            return res.status(400).json({ error: "Event ID is required" });
        }
        (0, logger_1.logInfo)("tickets:public-key", `Getting public key for event ${eventId}`);
        const result = await qrService_1.qrService.getEventPublicKey(eventId);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:public-key", "Failed to get public key", error);
        res.status(500).json({
            error: "Failed to get public key",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * POST /api/qr/verify
 * Verify a QR signature (optional backend verification)
 * Can also be done offline on mobile using public key
 */
exports.ticketsRouter.post("/verify", async (req, res) => {
    try {
        const { qrData, publicKey } = req.body;
        if (!qrData || !publicKey) {
            return res.status(400).json({ error: "QR data and public key are required" });
        }
        (0, logger_1.logInfo)("tickets:verify", "Verifying QR signature");
        const result = await qrService_1.qrService.verifyQRSignature(qrData, publicKey);
        res.json(result);
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:verify", "QR verification failed", error);
        res.status(500).json({
            error: "QR verification failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * POST /api/tickets/sync-google-sheets
 * Sync participant data from Google Sheets
 */
exports.ticketsRouter.post("/sync-google-sheets", async (req, res) => {
    try {
        const { eventId, sheetId } = req.body;
        if (!eventId || !sheetId) {
            return res.status(400).json({ error: "Event ID and Sheet ID are required" });
        }
        (0, logger_1.logInfo)("tickets:sync-sheets", `Syncing from Google Sheet ${sheetId} for event ${eventId}`);
        // Fetch rows from Google Sheets
        const sheetsData = await googleSheetsService_1.googleSheetsService.fetchSheetRows(sheetId);
        if (!sheetsData.rows || sheetsData.rows.length === 0) {
            return res.status(400).json({ error: "No data found in Google Sheet" });
        }
        // Log available columns for debugging
        if (sheetsData.rows.length > 0) {
            const sampleRow = sheetsData.rows[0];
            const columns = Object.keys(sampleRow);
            (0, logger_1.logInfo)("tickets:sync-sheets", `Found ${columns.length} columns: ${columns.join(", ")}`);
            // Log first row data for debugging
            (0, logger_1.logInfo)("tickets:sync-sheets", `First row data: ${JSON.stringify(sampleRow).substring(0, 200)}`);
        }
        // Convert Google Sheets rows to CSV format and import
        // Map sheet columns to expected import format
        const importedRows = [];
        const skippedRows = [];
        const errorsList = [];
        // Helper function to find column value with flexible matching
        const findColumnValue = (row, possibleNames) => {
            for (const name of possibleNames) {
                if (row[name])
                    return row[name];
            }
            // Try case-insensitive match
            const keys = Object.keys(row);
            for (const name of possibleNames) {
                const match = keys.find(k => k.toLowerCase() === name.toLowerCase());
                if (match && row[match])
                    return row[match];
            }
            return "";
        };
        for (let i = 0; i < sheetsData.rows.length; i++) {
            const row = sheetsData.rows[i];
            try {
                // Extract fields from Google Sheets row with flexible column matching
                const name = findColumnValue(row, ["NAME", "name", "Name", "Full Name", "FULL NAME"]);
                const registrationNo = findColumnValue(row, ["Registration No.", "REGISTRATION NO.", "registration no.", "Reg No", "REG NO"]);
                const email = findColumnValue(row, ["College Email Id", "COLLEGE EMAIL ID", "college email id", "Email", "EMAIL", "email", "Email Address"]);
                const contactNo = findColumnValue(row, ["Contact No.", "CONTACT NO.", "contact no.", "Phone", "PHONE", "Mobile", "MOBILE"]);
                const ticketType = findColumnValue(row, ["TICKET TYPE:", "TICKET TYPE", "ticket type:", "ticket type", "Ticket Type", "Type", "TYPE"]);
                // Debug log for first few rows
                if (i < 3) {
                    (0, logger_1.logInfo)("tickets:sync-sheets", `Row ${i + 1} - name: "${name}", email: "${email}", ticketType: "${ticketType}"`);
                    (0, logger_1.logInfo)("tickets:sync-sheets", `Row ${i + 1} - Available keys: ${Object.keys(row).join(", ")}`);
                }
                if (!name || !email || !ticketType) {
                    skippedRows.push(i + 1);
                    errorsList.push(`Row ${i + 1}: Missing required fields (NAME, EMAIL, TICKET TYPE)`);
                    continue;
                }
                // Add participant
                const result = await importService_1.importService.addParticipant(eventId, {
                    name,
                    email,
                    registrationNo,
                    contactNo,
                    ticketType,
                    // Check for duo participant
                    ...(ticketType.toLowerCase().includes("duo")
                        ? {
                            duo: {
                                name: findColumnValue(row, ["NAME:", "name:", "Name:", "NAME (2nd participant)"]),
                                email: findColumnValue(row, ["COLLEGE EMAIL ID:", "email:", "Email:", "EMAIL (2nd participant)"]),
                                registrationNo: findColumnValue(row, ["REGISTRATION NO.:", "REGISTRATION NO:", "registration no.:", "Reg No (2nd)"]),
                                contactNo: findColumnValue(row, ["CONTACT NO.:", "CONTACT NO:", "contact no.:", "Phone (2nd)"]),
                            },
                        }
                        : {}),
                });
                importedRows.push(result);
            }
            catch (error) {
                errorsList.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
                skippedRows.push(i + 1);
            }
        }
        (0, logger_1.logInfo)("tickets:sync-sheets", `Sync complete: ${importedRows.length} imported, ${skippedRows.length} skipped`);
        res.json({
            success: true,
            imported: importedRows.length,
            skipped: skippedRows.length,
            errors: errorsList.slice(0, 50), // Limit errors shown
            totalRows: sheetsData.rows.length,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:sync-sheets", "Google Sheets sync failed", error);
        res.status(500).json({
            error: "Google Sheets sync failed",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
/**
 * DELETE /api/tickets/events/:eventId/clear
 * Clear all tickets for an event
 */
exports.ticketsRouter.delete("/events/:eventId/clear", async (req, res) => {
    try {
        const { eventId } = req.params;
        (0, logger_1.logInfo)("tickets:clear", `Clearing all tickets for event ${eventId}`);
        const result = await Ticket_1.Ticket.deleteMany({ eventId });
        (0, logger_1.logInfo)("tickets:clear", `Deleted ${result.deletedCount} tickets`);
        res.json({
            success: true,
            deletedCount: result.deletedCount,
            message: `Successfully deleted ${result.deletedCount} tickets`,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("tickets:clear", "Failed to clear tickets", error);
        res.status(500).json({
            error: "Failed to clear tickets",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
