"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticketsRouter = void 0;
const express_1 = require("express");
const importService_1 = require("../services/importService");
const qrService_1 = require("../services/qrService");
const googleSheetsService_1 = require("../services/googleSheetsService");
const logger_1 = require("../utils/logger");
const multer_1 = __importDefault(require("multer"));
exports.ticketsRouter = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
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
        // Convert Google Sheets rows to CSV format and import
        // Map sheet columns to expected import format
        const importedRows = [];
        const skippedRows = [];
        const errorsList = [];
        for (let i = 0; i < sheetsData.rows.length; i++) {
            const row = sheetsData.rows[i];
            try {
                // Extract fields from Google Sheets row
                const name = row["NAME"] || row["name"] || "";
                const registrationNo = row["Registration No."] || row["registration no."] || row["REGISTRATION NO."] || "";
                const email = row["College Email Id"] || row["college email id"] || row["EMAIL"] || "";
                const contactNo = row["Contact No."] || row["contact no."] || row["CONTACT NO."] || "";
                const ticketType = row["TICKET TYPE"] || row["ticket type"] || "";
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
                                name: row["NAME:"] || row["name:"] || "",
                                email: row["COLLEGE EMAIL ID:"] || row["email:"] || "",
                                registrationNo: row["REGISTRATION NO.:"] || row["registration no.:"] || "",
                                contactNo: row["CONTACT NO.:"] || row["contact no.:"] || "",
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
