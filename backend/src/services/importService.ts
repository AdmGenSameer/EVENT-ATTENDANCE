import { Ticket } from "../db/models/Ticket";
import { parseCsv, CsvRow } from "../utils/csv";
import { logInfo, logWarn } from "../utils/logger";
import { TicketType } from "../constants/ticketTypes";
import crypto from "crypto";
import { Types } from "mongoose";

// Map user-friendly ticket types to internal types
const TICKET_TYPE_MAP: { [key: string]: TicketType } = {
  "REGULAR": "GUEST",
  "REGULAR DUO": "COUPLE",
  "FRONT ROW SOLO": "STUDENT",
  "FRONT ROW DUO": "CHILD",
};

const getTicketType = (raw: string): TicketType | null => {
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, " ");
  return TICKET_TYPE_MAP[normalized] || null;
};

const parseTimestamp = (raw: string) => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const generateTicketCode = (prefix: string) => {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
};

export const importService = {
  async importTicketsFromCsv(eventId: string, csvText: string) {
    try {
      logInfo("importService:csv", `Parsing CSV for event ${eventId}`);
      const rows = parseCsv(csvText);
      return await importService.importTicketsFromRegistrationSheet(eventId, rows);
    } catch (error) {
      logWarn("importService:csv", "Failed to import CSV", error);
      throw error;
    }
  },

  /**
   * Parse registration sheet with structure:
   * NAME, Registration No., College Email Id, Contact No., Batch, Referral Code, TICKET TYPE,
   * NAME (2nd participant), REGISTRATION NO., COLLEGE EMAIL ID, CONTACT NO.
   */
  async importTicketsFromRegistrationSheet(eventId: string, rows: CsvRow[]) {
    try {
      if (!rows.length) {
        return { imported: 0, skipped: 0, errors: [] as string[] };
      }

      const errors: string[] = [];
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
          const primaryTicket = await Ticket.create({
            eventId: new Types.ObjectId(eventId),
            ticketCode,
            name: primaryName,
            personalEmail: primaryEmail,
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
          logInfo("importService", `Created ticket for ${primaryName} (${ticketCode})`);

          // Handle duo participants (REGULAR DUO, FRONT ROW DUO)
          if (ticketType === "COUPLE" || ticketType === "CHILD") {
            const secondName = (row["NAME:"] || "").trim(); // Second NAME field
            const secondEmail = (row["COLLEGE EMAIL ID:"] || "").trim(); // Second COLLEGE EMAIL ID field
            const secondRegistration = (row["REGISTRATION NO.:"] || "").trim(); // Second REGISTRATION NO. field

            if (secondName && secondEmail) {
              const secondTicketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
              await Ticket.create({
                eventId: new Types.ObjectId(eventId),
                ticketCode: secondTicketCode,
                name: secondName,
                personalEmail: secondEmail,
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
              logInfo("importService", `Created duo ticket for ${secondName} (${secondTicketCode})`);
            } else {
              logWarn("importService", `Row ${index + 1}: duo ticket missing second participant data`);
            }
          }
        } catch (rowError) {
          errors.push(`Row ${index + 1}: ${rowError instanceof Error ? rowError.message : "unknown error"}`);
          skipped += 1;
        }
      }

      logInfo("importService", `Import complete: ${imported} imported, ${skipped} skipped`);
      return { imported, skipped, errors };
    } catch (error) {
      logWarn("importService", "Failed to process registration sheet", error);
      throw error;
    }
  },

  /**
   * Add a single participant manually
   */
  async addParticipant(eventId: string, participantData: {
    name: string;
    email: string;
    registrationNo?: string;
    contactNo?: string;
    ticketType: string;
    duo?: {
      name: string;
      email: string;
      registrationNo?: string;
      contactNo?: string;
    };
  }) {
    try {
      const ticketType = getTicketType(participantData.ticketType);
      if (!ticketType) {
        throw new Error(`Invalid ticket type: ${participantData.ticketType}`);
      }

      if (!participantData.name || !participantData.email) {
        throw new Error("Name and email are required");
      }

      const ticketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
      const ticket = await Ticket.create({
        eventId: new Types.ObjectId(eventId),
        ticketCode,
        name: participantData.name,
        personalEmail: participantData.email,
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

      logInfo("importService", `Added participant: ${participantData.name} (${ticketCode})`);

      // Handle duo participant
      if ((ticketType === "COUPLE" || ticketType === "CHILD") && participantData.duo?.name && participantData.duo?.email) {
        const secondTicketCode = generateTicketCode(eventId.slice(0, 4).toUpperCase());
        await Ticket.create({
          eventId: new Types.ObjectId(eventId),
          ticketCode: secondTicketCode,
          name: participantData.duo.name,
          personalEmail: participantData.duo.email,
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

        logInfo("importService", `Added duo participant: ${participantData.duo.name} (${secondTicketCode})`);
      }

      return { success: true, ticketId: ticket._id, ticketCode };
    } catch (error) {
      logWarn("importService", "Failed to add participant", error);
      throw error;
    }
  },
};
