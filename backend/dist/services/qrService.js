"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrService = void 0;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const Event_1 = require("../db/models/Event");
const Ticket_1 = require("../db/models/Ticket");
const logger_1 = require("../utils/logger");
const mongoose_1 = require("mongoose");
exports.qrService = {
    /**
     * Generate Ed25519 keypair for an event
     * Private key stored encrypted in backend, public key shared with mobile app
     */
    async generateEventKeyPair(eventId) {
        try {
            (0, logger_1.logInfo)("qrService:generateKeys", `Generating Ed25519 keypair for event ${eventId}`);
            // Generate keypair using TweetNaCl
            const keypair = tweetnacl_1.default.sign.keyPair();
            // Convert to hex strings
            const publicKeyHex = Buffer.from(keypair.publicKey).toString("hex");
            const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");
            return {
                publicKey: publicKeyHex,
                privateKey: privateKeyHex,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("qrService:generateKeys", "Failed to generate keypair", error);
            throw error;
        }
    },
    /**
     * Create secure QR payload and sign with Ed25519
     */
    async generateSecureQRPayload(ticketId, eventId, category, privateKeyHex, expiryDays = 365) {
        try {
            const expiry = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;
            // Create unsigned payload
            const unsignedPayload = {
                v: 1,
                tid: ticketId,
                eid: eventId,
                exp: expiry,
                cat: category,
            };
            // Sign the payload with Ed25519
            const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
            const payloadJson = JSON.stringify(unsignedPayload);
            const messageBytes = Buffer.from(payloadJson, "utf-8");
            const signature = tweetnacl_1.default.sign.detached(messageBytes, privateKeyBuffer);
            const signatureBase64Url = Buffer.from(signature).toString("base64url");
            return {
                ...unsignedPayload,
                sig: signatureBase64Url,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("qrService:generatePayload", "Failed to generate QR payload", error);
            throw error;
        }
    },
    /**
     * Generate QR for a single ticket
     */
    // async generateSingleQR(ticketId: string) {
    //   try {
    //     logInfo("qrService:generateSingle", `Generating QR for ticket ${ticketId}`);
    //     const ticket = await Ticket.findById(ticketId).populate("eventId");
    //     if (!ticket) {
    //       throw new Error("Ticket not found");
    //     }
    //     const event = await Event.findById(ticket.eventId);
    //     if (!event) {
    //       throw new Error("Event not found");
    //     }
    //     const privateKey = (event as any).qrPrivateKey || (event as any).privateKey;
    //     if (!privateKey) {
    //       throw new Error("Event has no QR private key configured");
    //     }
    //     // Generate secure payload
    //     const payload = await qrService.generateSecureQRPayload(
    //       ticketId,
    //       event._id.toString(),
    //       ticket.ticketType,
    //       privateKey
    //     );
    //     // Encode to Base64 for QR
    //     const payloadJson = JSON.stringify(payload);
    //     const qrData = Buffer.from(payloadJson).toString("base64");
    //     // Update ticket with QR data
    //     ticket.qrData = qrData;
    //     await ticket.save();
    //     logInfo("qrService:generateSingle", `QR generated for ${ticket.name}`);
    //     return {
    //       success: true,
    //       ticketId,
    //       ticketCode: ticket.ticketCode,
    //       qrData,
    //       payload,
    //     };
    //   } catch (error) {
    //     logWarn("qrService:generateSingle", "Failed to generate QR", error);
    //     throw error;
    //   }
    // },
    async generateSingleQR(ticketId) {
        try {
            (0, logger_1.logInfo)("qrService:generateSingle", `Generating QR for ticket ${ticketId}`);
            const ticket = await Ticket_1.Ticket.findById(ticketId);
            if (!ticket) {
                throw new Error("Ticket not found");
            }
            const event = await Event_1.Event.findById(ticket.eventId).select('+qrPrivateKey');
            if (!event) {
                throw new Error("Event not found");
            }
            const privateKey = event.qrPrivateKey;
            if (!privateKey) {
                throw new Error("Event has no QR private key configured");
            }
            const payload = await exports.qrService.generateSecureQRPayload(ticket._id.toString(), event._id.toString(), ticket.ticketType, privateKey);
            const payloadJson = JSON.stringify(payload);
            const qrData = Buffer.from(payloadJson).toString("base64url");
            ticket.qrData = qrData;
            await ticket.save();
            return {
                success: true,
                ticketId: ticket._id,
                ticketCode: ticket.ticketCode,
                qrData,
                payload,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("qrService:generateSingle", "Failed to generate QR", error);
            throw error;
        }
    },
    /**
     * Bulk generate QRs for all tickets in an event
     */
    // async generateBulkQRs(eventId: string) {
    //   try {
    //     logInfo("qrService:generateBulk", `Generating QRs in bulk for event ${eventId}`);
    //     const event = await Event.findById(eventId);
    //     if (!event) {
    //       throw new Error("Event not found");
    //     }
    //     const privateKey = (event as any).qrPrivateKey || (event as any).privateKey;
    //     if (!privateKey) {
    //       throw new Error("Event has no QR private key configured");
    //     }
    //     // Get all tickets for this event that don't have QR yet
    //     const tickets = await Ticket.find({
    //       eventId: new Types.ObjectId(eventId),
    //       qrData: { $in: [null, ""] },
    //     });
    //     logInfo("qrService:generateBulk", `Found ${tickets.length} tickets without QR`);
    //     const results = {
    //       total: tickets.length,
    //       generated: 0,
    //       failed: 0,
    //       errors: [] as string[],
    //     };
    //     // Generate QR for each ticket
    //     for (const ticket of tickets) {
    //       try {
    //         const payload = await qrService.generateSecureQRPayload(
    //           ticket._id.toString(),
    //           eventId,
    //           ticket.ticketType,
    //           privateKey
    //         );
    //         const payloadJson = JSON.stringify(payload);
    //         const qrData = Buffer.from(payloadJson).toString("base64");
    //         ticket.qrData = qrData;
    //         await ticket.save();
    //         results.generated += 1;
    //         logInfo("qrService:generateBulk", `Generated QR for ${ticket.name}`);
    //       } catch (error) {
    //         results.failed += 1;
    //         results.errors.push(
    //           `${ticket.name}: ${error instanceof Error ? error.message : "unknown error"}`
    //         );
    //         logWarn("qrService:generateBulk", `Failed for ${ticket.name}`, error);
    //       }
    //     }
    //     logInfo(
    //       "qrService:generateBulk",
    //       `Bulk generation complete: ${results.generated} generated, ${results.failed} failed`
    //     );
    //     return results;
    //   } catch (error) {
    //     logWarn("qrService:generateBulk", "Bulk generation failed", error);
    //     throw error;
    //   }
    // },
    //updated bulk generate to work with participants instead of tickets
    async generateBulkQRs(eventId) {
        try {
            const event = await Event_1.Event.findById(eventId).select('+qrPrivateKey');
            if (!event) {
                throw new Error("Event not found");
            }
            const privateKey = event.qrPrivateKey || event.privateKey;
            if (!privateKey) {
                throw new Error("Event has no QR private key configured");
            }
            // Get all tickets for this event that don't have QR yet
            const tickets = await Ticket_1.Ticket.find({
                eventId: new mongoose_1.Types.ObjectId(eventId),
                qrData: { $in: [null, ""] },
            });
            (0, logger_1.logInfo)("qrService:generateBulk", `Found ${tickets.length} tickets without QR`);
            const results = {
                total: tickets.length,
                generated: 0,
                failed: 0,
                errors: [],
            };
            // Generate QR for each ticket
            for (const ticket of tickets) {
                try {
                    const payload = await exports.qrService.generateSecureQRPayload(ticket._id.toString(), eventId, ticket.ticketType, privateKey);
                    const payloadJson = JSON.stringify(payload);
                    const qrData = Buffer.from(payloadJson).toString("base64url");
                    ticket.qrData = qrData;
                    await ticket.save();
                    results.generated += 1;
                    (0, logger_1.logInfo)("qrService:generateBulk", `Generated QR for ${ticket.name}`);
                }
                catch (error) {
                    results.failed += 1;
                    results.errors.push(`${ticket.name}: ${error instanceof Error ? error.message : "unknown error"}`);
                    (0, logger_1.logWarn)("qrService:generateBulk", `Failed for ${ticket.name}`, error);
                }
            }
            (0, logger_1.logInfo)("qrService:generateBulk", `Bulk generation complete: ${results.generated} generated, ${results.failed} failed`);
            return results;
        }
        catch (error) {
            (0, logger_1.logWarn)("qrService:generateBulk", "Bulk generation failed", error);
            throw error;
        }
    },
    /**
     * Clear QR data for all tickets in an event
     */
    async clearEventQrData(eventId) {
        try {
            const result = await Ticket_1.Ticket.updateMany({ eventId: new mongoose_1.Types.ObjectId(eventId) }, { $set: { qrData: null } });
            return {
                cleared: result.modifiedCount,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("qrService:clearEventQrData", "Failed to clear QR data", error);
            throw error;
        }
    },
    /**
     * Verify QR signature (for scanner app)
     * Public key downloaded to mobile and used for offline verification
     */
    async verifyQRSignature(qrDataBase64, publicKeyHex) {
        try {
            // Decode Base64
            const payloadJson = Buffer.from(qrDataBase64, "base64url").toString("utf-8");
            const payload = JSON.parse(payloadJson);
            // Extract signature
            const { sig, ...unsignedPayload } = payload;
            if (!sig) {
                return { valid: false, error: "No signature found in QR" };
            }
            // Recreate the original message
            const messageJson = JSON.stringify(unsignedPayload);
            const messageBytes = Buffer.from(messageJson, "utf-8");
            // Verify signature with Ed25519
            const publicKeyBuffer = Buffer.from(publicKeyHex, "hex");
            const signatureBuffer = Buffer.from(sig, "base64url");
            const isValid = tweetnacl_1.default.sign.detached.verify(messageBytes, signatureBuffer, publicKeyBuffer);
            if (!isValid) {
                return { valid: false, error: "Signature verification failed - QR may be tampered" };
            }
            // Check expiry
            if (payload.exp < Math.floor(Date.now() / 1000)) {
                return { valid: false, error: "QR has expired" };
            }
            return { valid: true, payload };
        }
        catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : "Verification failed",
            };
        }
    },
    /**
     * Get event public key for scanner app
     */
    async getEventPublicKey(eventId) {
        try {
            const event = await Event_1.Event.findById(eventId);
            if (!event) {
                throw new Error("Event not found");
            }
            const publicKey = event.qrPublicKey || event.publicKey;
            if (!publicKey) {
                throw new Error("Event has no public key configured");
            }
            return {
                eventId,
                publicKey,
                keyVersion: 1,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("qrService:getPublicKey", "Failed to get public key", error);
            throw error;
        }
    },
    /**
     * Legacy method - kept for compatibility
     */
    async generateTicketsForEvent(eventId) {
        return exports.qrService.generateBulkQRs(eventId);
    },
};
