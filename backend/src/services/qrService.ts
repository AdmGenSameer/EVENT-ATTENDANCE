import crypto from "crypto";
import { prisma } from "../db/prisma";
import { logInfo, logWarn } from "../utils/logger";

const signPayload = (payload: Record<string, unknown>, privateKeyPem: string) => {
  try {
    const raw = Buffer.from(JSON.stringify(payload));
    const signature = crypto.sign(null, raw, privateKeyPem);
    return signature.toString("base64url");
  } catch (error) {
    logWarn("qrService:sign", "Failed to sign payload", error);
    throw error;
  }
};

const encodeToken = (payload: Record<string, unknown>) => {
  try {
    const raw = Buffer.from(JSON.stringify(payload));
    return raw.toString("base64url");
  } catch (error) {
    logWarn("qrService:encode", "Failed to encode payload", error);
    throw error;
  }
};

export const qrService = {
  async generateTicketsForEvent(eventId: string, exp?: number, force = false) {
    try {
      logInfo("qrService:generate", `Generating QR tokens for ${eventId}`);
      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw new Error("Event not found");
      }

      const tickets = await prisma.ticket.findMany({ where: { eventId } });
      let updated = 0;
      let skipped = 0;

      for (const ticket of tickets) {
        if (ticket.qrData && !force) {
          skipped += 1;
          continue;
        }

        const unsignedPayload: Record<string, unknown> = {
          v: 1,
          tid: ticket.id,
          eid: eventId,
          exp: typeof exp === "number" ? exp : undefined,
        };

        const signature = signPayload(unsignedPayload, event.privateKey);
        const signedPayload = {
          ...unsignedPayload,
          sig: signature,
        };

        const token = encodeToken(signedPayload);
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { qrData: token },
        });
        updated += 1;
      }

      logInfo("qrService:generate", `Updated ${updated}, skipped ${skipped}`);
      return { updated, skipped };
    } catch (error) {
      logWarn("qrService:generate", "Failed to generate QR tokens", error);
      throw error;
    }
  },
};
