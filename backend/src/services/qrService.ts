import crypto from "crypto";
import nacl from "tweetnacl";
import { Event } from "../db/models/Event";
import { Ticket } from "../db/models/Ticket";
import { logInfo, logWarn } from "../utils/logger";
import { Types } from "mongoose";
import { Participants } from "../db/models/ParticipantsModel";

/**
 * QR Payload Structure (Secure Ed25519 signed)
 * {
 *   "v": 1,                      // Version
 *   "tid": "ticket-id",          // Ticket ID
 *   "eid": "event-id",           // Event ID
 *   "exp": 1760000000,           // Expiry (unix timestamp)
 *   "cat": "REGULAR_SINGLE",     // Category/Type
 *   "sig": "hex_signature"       // Ed25519 signature (hex)
 * }
 */

// interface QRPayload {
//   v: number;
//   tid: string;
//   eid: string;
//   exp: number;
//   cat: string;
//   sig?: string;
// }

//updated QRPayload to replace tid with pid for participant id instead of ticket id
interface QRPayload {
  v: number;
  pid: string;   
  eid: string;
  exp: number;
  cat: string;
  sig?: string;
}

export const qrService = {
  /**
   * Generate Ed25519 keypair for an event
   * Private key stored encrypted in backend, public key shared with mobile app
   */
  async generateEventKeyPair(eventId: string) {
    try {
      logInfo("qrService:generateKeys", `Generating Ed25519 keypair for event ${eventId}`);

      // Generate keypair using TweetNaCl
      const keypair = nacl.sign.keyPair();

      // Convert to hex strings
      const publicKeyHex = Buffer.from(keypair.publicKey).toString("hex");
      const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");

      return {
        publicKey: publicKeyHex,
        privateKey: privateKeyHex,
      };
    } catch (error) {
      logWarn("qrService:generateKeys", "Failed to generate keypair", error);
      throw error;
    }
  },

  /**
   * Create secure QR payload and sign with Ed25519
   */
  async generateSecureQRPayload(
    // ticketId: string,
    participantId: string,
    eventId: string,
    category: string,
    privateKeyHex: string,
    expiryDays: number = 365
  ): Promise<QRPayload> {
    try {
      const expiry = Math.floor(Date.now() / 1000) + expiryDays * 24 * 60 * 60;

      // Create unsigned payload
      const unsignedPayload: Omit<QRPayload, "sig"> = {
        v: 1,
        // tid: ticketId,
        pid: participantId,
        eid: eventId,
        exp: expiry,
        cat: category,
      };

      // Sign the payload with Ed25519
      const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
      const payloadJson = JSON.stringify(unsignedPayload);
      const messageBytes = Buffer.from(payloadJson, "utf-8");

      const signature = nacl.sign.detached(messageBytes, privateKeyBuffer);
      const signatureHex = Buffer.from(signature).toString("hex");

      return {
        ...unsignedPayload,
        sig: signatureHex,
      };
    } catch (error) {
      logWarn("qrService:generatePayload", "Failed to generate QR payload", error);
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

  //updated generate single qr to work with participants instead of tickets
  async generateSingleQR(participantId: string) {
    try {
      logInfo("qrService:generateSingle", `Generating QR for participant ${participantId}`);

      const participant = await Participants.findById(participantId);
      if (!participant) {
        throw new Error("Participant not found");
      }

      const event = await Event.findById(participant.eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      const privateKey = (event as any).qrPrivateKey;
      if (!privateKey) {
        throw new Error("Event has no QR private key configured");
      }

      const payload = await qrService.generateSecureQRPayload(
        participant._id.toString(),
        event._id.toString(),
        participant.ticketType || "REGULAR_SINGLE",
        privateKey
      );

      const payloadJson = JSON.stringify(payload);
      const qrData = Buffer.from(payloadJson).toString("base64");

      participant.qrData = qrData;
      await participant.save();

      return {
        success: true,
        participantId: participant._id,
        registrationNumber: participant.registrationNumber,
        qrData,
        payload,
      };
    } catch (error) {
      logWarn("qrService:generateSingle", "Failed to generate QR", error);
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
  async generateBulkQRs(eventId: string) {
  try {
    const event = await Event.findById(eventId);
    if (!event) throw new Error("Event not found");

    const privateKey = (event as any).qrPrivateKey;
    if (!privateKey) {
      throw new Error("Event has no QR private key configured");
    }
    const participants = await Participants.find({
      eventId: new Types.ObjectId(eventId),
      qrData: { $in: [null, ""] },
    });

    const results = {
      total: participants.length,
      generated: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const participant of participants) {
      try {
        const payload = await qrService.generateSecureQRPayload(
          participant._id.toString(),
          eventId,
          participant.ticketType || "REGULAR_SINGLE",
          privateKey
        );

        const payloadJson = JSON.stringify(payload);
        const qrData = Buffer.from(payloadJson).toString("base64");

        participant.qrData = qrData;
        await participant.save();

        results.generated += 1;
      } catch (error) {
        results.failed += 1;
        results.errors.push(
          `${participant.name}: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        );
      }
    }

    return results;
  } catch (error) {
    throw error;
  }
}
  /**
   * Verify QR signature (for scanner app)
   * Public key downloaded to mobile and used for offline verification
   */
  async verifyQRSignature(
    qrDataBase64: string,
    publicKeyHex: string
  ): Promise<{ valid: boolean; payload?: QRPayload; error?: string }> {
    try {
      // Decode Base64
      const payloadJson = Buffer.from(qrDataBase64, "base64").toString("utf-8");
      const payload: QRPayload = JSON.parse(payloadJson);

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
      const signatureBuffer = Buffer.from(sig, "hex");

      const isValid = nacl.sign.detached.verify(messageBytes, signatureBuffer, publicKeyBuffer);

      if (!isValid) {
        return { valid: false, error: "Signature verification failed - QR may be tampered" };
      }

      // Check expiry
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, error: "QR has expired" };
      }

      return { valid: true, payload };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  },

  /**
   * Get event public key for scanner app
   */
  async getEventPublicKey(eventId: string) {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error("Event not found");
      }

      const publicKey = (event as any).qrPublicKey || (event as any).publicKey;
      if (!publicKey) {
        throw new Error("Event has no public key configured");
      }

      return {
        eventId,
        publicKey,
        keyVersion: 1,
      };
    } catch (error) {
      logWarn("qrService:getPublicKey", "Failed to get public key", error);
      throw error;
    }
  },

  /**
   * Legacy method - kept for compatibility
   */
  async generateTicketsForEvent(eventId: string) {
    return qrService.generateBulkQRs(eventId);
  },
};
