"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importService = void 0;
const Ticket_1 = require("../db/models/Ticket");
const csv_1 = require("../utils/csv");
const logger_1 = require("../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const mongoose_1 = require("mongoose");
const getTicketType = (raw) => {
    if (!raw)
        return null;
    // Remove price suffix (e.g., "REGULAR - ₹499" -> "REGULAR")
    const withoutPrice = raw.split(" - ")[0].trim();
    const normalized = withoutPrice.toUpperCase().replace(/\s+/g, " ");
    // Validate against allowed types
    const validTypes = ['REGULAR', 'REGULAR DUO', 'FRONT ROW SOLO', 'FRONT ROW DUO'];
    return validTypes.includes(normalized) ? normalized : null;
};
const parseTimestamp = (raw) => {
    const trimmed = raw?.trim();
    if (!trimmed) {
        return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const generateTicketCode = (prefix) => {
    const random = crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${random}`;
};
exports.importService = {
    async importTicketsFromCsv(eventId, csvText) {
        try {
            (0, logger_1.logInfo)("importService:csv", `Parsing CSV for event ${eventId}`);
            const rows = (0, csv_1.parseCsv)(csvText);
            return await exports.importService.importTicketsFromRegistrationSheet(eventId, rows);
        }
        catch (error) {
            (0, logger_1.logWarn)("importService:csv", "Failed to import CSV", error);
            throw error;
        }
    },
    /**
     * Parse registration sheet with structure:
     * NAME, Registration No., College Email Id, Contact No., Batch, Referral Code, TICKET TYPE,
     * NAME (2nd participant), REGISTRATION NO., COLLEGE EMAIL ID, CONTACT NO.
     */
    async importTicketsFromRegistrationSheet(eventId, rows) {
        try {
            if (!rows.length) {
                return { imported: 0, skipped: 0, errors: [] };
            }
            // Validate or create ObjectId
            let eventObjectId;
            try {
                eventObjectId = mongoose_1.Types.ObjectId.isValid(eventId) ? new mongoose_1.Types.ObjectId(eventId) : new mongoose_1.Types.ObjectId();
            }
            catch {
                eventObjectId = new mongoose_1.Types.ObjectId();
            }
            const errors = [];
            let imported = 0;
            let skipped = 0;
            for (const [index, row] of rows.entries()) {
                try {
                    // Parse ticket type (supports: regular, regular duo, front row solo, front row duo)
                    const ticketType = getTicketType(row["TICKET TYPE"] || "");
                    if (!ticketType) {
                        errors.push(`Row ${index + 1}: invalid ticket type "${row["TICKET TYPE"]}"`);
                        skipped += 1;
                        continue;
                    }
                    // Primary participant
                    const primaryName = (row["NAME"] || "").trim();
                    const primaryEmail = (row["COLLEGE EMAIL ID"] || row["College Email Id"] || "").trim();
                    const registrationNo = (row["REGISTRATION NO."] || row["Registration No."] || "").trim();
                    const contactNo = (row["CONTACT NO."] || row["Contact No."] || "").trim();
                    if (!primaryName || !primaryEmail) {
                        errors.push(`Row ${index + 1}: missing primary participant name or email`);
                        skipped += 1;
                        continue;
                    }
                    // Create primary ticket
                    const ticketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
                    const primaryTicket = await Ticket_1.Ticket.create({
                        eventId: eventObjectId,
                        ticketCode,
                        name: primaryName,
                        personalEmail: primaryEmail,
                        registrationNo: registrationNo || null,
                        contactNo: contactNo || null,
                        ticketType,
                        duoParticipants: [{
                                participantNumber: 1,
                                fullName: primaryName,
                                status: "registered"
                            }],
                        checkedIn: false,
                        checkedInAt: null,
                        checkInTime: null,
                        checkInBy: null,
                    });
                    imported += 1;
                    (0, logger_1.logInfo)("importService", `Created ticket for ${primaryName} (${ticketCode})`);
                    // Handle duo participants (REGULAR DUO, FRONT ROW DUO)
                    if (ticketType === "REGULAR DUO" || ticketType === "FRONT ROW DUO") {
                        const secondName = (row["NAME:"] || "").trim(); // Second NAME field
                        const secondEmail = (row["COLLEGE EMAIL ID:"] || "").trim(); // Second COLLEGE EMAIL ID field
                        const secondRegistration = (row["REGISTRATION NO.:"] || "").trim(); // Second REGISTRATION NO. field
                        if (secondName && secondEmail) {
                            const secondTicketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
                            const secondContact = (row["CONTACT NO.:"]) || "";
                            await Ticket_1.Ticket.create({
                                eventId: eventObjectId,
                                ticketCode: secondTicketCode,
                                name: secondName,
                                personalEmail: secondEmail,
                                registrationNo: secondRegistration || null,
                                contactNo: secondContact || null,
                                ticketType,
                                duoParticipants: [{
                                        participantNumber: 2,
                                        fullName: secondName,
                                        status: "registered"
                                    }],
                                checkedIn: false,
                                checkedInAt: null,
                                checkInTime: null,
                                checkInBy: null,
                            });
                            imported += 1;
                            (0, logger_1.logInfo)("importService", `Created duo ticket for ${secondName} (${secondTicketCode})`);
                        }
                        else {
                            (0, logger_1.logWarn)("importService", `Row ${index + 1}: duo ticket missing second participant data`);
                        }
                    }
                }
                catch (rowError) {
                    errors.push(`Row ${index + 1}: ${rowError instanceof Error ? rowError.message : "unknown error"}`);
                    skipped += 1;
                }
            }
            (0, logger_1.logInfo)("importService", `Import complete: ${imported} imported, ${skipped} skipped`);
            return { imported, skipped, errors };
        }
        catch (error) {
            (0, logger_1.logWarn)("importService", "Failed to process registration sheet", error);
            throw error;
        }
    },
    /**
     * Add a single participant manually
     */
    async addParticipant(eventId, participantData) {
        try {
            const ticketType = getTicketType(participantData.ticketType);
            if (!ticketType) {
                throw new Error(`Invalid ticket type: ${participantData.ticketType}`);
            }
            if (!participantData.name || !participantData.email) {
                throw new Error("Name and email are required");
            }
            // Validate or create ObjectId
            let eventObjectId;
            try {
                eventObjectId = mongoose_1.Types.ObjectId.isValid(eventId) ? new mongoose_1.Types.ObjectId(eventId) : new mongoose_1.Types.ObjectId();
            }
            catch {
                eventObjectId = new mongoose_1.Types.ObjectId();
            }
            // Check for duplicate participant with same email for this event
            const existingParticipant = await Ticket_1.Ticket.findOne({
                eventId: eventObjectId,
                personalEmail: participantData.email.toLowerCase(),
            });
            if (existingParticipant) {
                throw new Error(`Participant with email ${participantData.email} already exists for this event (Ticket: ${existingParticipant.ticketCode})`);
            }
            const ticketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
            const ticket = await Ticket_1.Ticket.create({
                eventId: eventObjectId,
                ticketCode,
                name: participantData.name,
                personalEmail: participantData.email,
                registrationNo: participantData.registrationNo || null,
                contactNo: participantData.contactNo || null,
                ticketType,
                duoParticipants: [{
                        participantNumber: 1,
                        fullName: participantData.name,
                        status: "registered"
                    }],
                checkedIn: false,
                checkedInAt: null,
                checkInTime: null,
                checkInBy: null,
            });
            (0, logger_1.logInfo)("importService", `Added participant: ${participantData.name} (${ticketCode})`);
            // Handle duo participant
            if ((ticketType === "REGULAR DUO" || ticketType === "FRONT ROW DUO") && participantData.duo?.name && participantData.duo?.email) {
                const secondTicketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
                await Ticket_1.Ticket.create({
                    eventId: eventObjectId,
                    ticketCode: secondTicketCode,
                    name: participantData.duo.name,
                    personalEmail: participantData.duo.email,
                    registrationNo: participantData.duo.registrationNo || null,
                    contactNo: participantData.duo.contactNo || null,
                    ticketType,
                    duoParticipants: [{
                            participantNumber: 2,
                            fullName: participantData.duo.name,
                            status: "registered"
                        }],
                    checkedIn: false,
                    checkedInAt: null,
                    checkInTime: null,
                    checkInBy: null,
                });
                (0, logger_1.logInfo)("importService", `Added duo participant: ${participantData.duo.name} (${secondTicketCode})`);
            }
            return { success: true, ticketId: ticket._id, ticketCode };
        }
        catch (error) {
            (0, logger_1.logWarn)("importService", "Failed to add participant", error);
            throw error;
        }
    },
};
