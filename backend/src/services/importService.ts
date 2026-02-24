import { prisma } from "../db/prisma";
import { parseCsv, CsvRow } from "../utils/csv";
import { logInfo, logWarn } from "../utils/logger";
import { TicketType } from "../constants/ticketTypes";
import crypto from "crypto";

const getTicketType = (raw: string): TicketType | null => {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (normalized === "REGULAR_SINGLE" || normalized === "REGULAR_DUO" || normalized === "FRONT_SINGLE" || normalized === "FRONT_DUO") {
    return normalized as TicketType;
  }
  return null;
};

const parseTimestamp = (raw: string) => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const generateGroupId = () => crypto.randomUUID();

const generateTicketCode = (prefix: string) => {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
};

export const importService = {
  async importTicketsFromCsv(eventId: string, csvText: string) {
    try {
      logInfo("importService:csv", `Parsing CSV for event ${eventId}`);
      const rows = parseCsv(csvText);
      return await importService.importTicketsFromRows(eventId, rows, "csv");
    } catch (error) {
      logWarn("importService:csv", "Failed to import CSV", error);
      throw error;
    }
  },

  async importTicketsFromRows(eventId: string, rows: CsvRow[], source: "csv" | "sheets") {
    try {
      if (!rows.length) {
        return { imported: 0, skipped: 0, errors: [] as string[] };
      }

      const errors: string[] = [];
      let imported = 0;
      let skipped = 0;

      for (const [index, row] of rows.entries()) {
        try {
          const ticketType = getTicketType(row["TICKET TYPE"] || "");
          if (!ticketType) {
            errors.push(`Row ${index + 1}: invalid ticket type`);
            skipped += 1;
            continue;
          }

          const duoGroupId = ticketType.endsWith("DUO") ? generateGroupId() : null;
          const submittedAt = parseTimestamp(row["Timestamp"] || "");
          const baseData = {
            eventId,
            submittedAt: submittedAt ?? undefined,
            name: row["NAME"] || "",
            personalEmail: row["Email Address"] || "",
            collegeEmail: row["College Email Id"] || undefined,
            regNo: row["Registration No."] || undefined,
            phone: row["Contact No."] || undefined,
            batch: row["Batch"] || undefined,
            referral: row["Referral Code"] || undefined,
            txnId: row["Transaction ID"] || undefined,
            payerName: row["Beneficiary Name"] || undefined,
            paymentProofUrl: row["Payment Screenshot"] || undefined,
            ticketType,
            duoGroupId: duoGroupId ?? undefined,
          };

          if (!baseData.name || !baseData.personalEmail) {
            errors.push(`Row ${index + 1}: missing name or email`);
            skipped += 1;
            continue;
          }

          const createTicket = async (participantName: string, participantEmail: string, participantRegNo?: string, participantCollegeEmail?: string) => {
            return prisma.ticket.create({
              data: {
                ...baseData,
                name: participantName,
                personalEmail: participantEmail,
                regNo: participantRegNo || baseData.regNo,
                collegeEmail: participantCollegeEmail || baseData.collegeEmail,
                ticketCode: generateTicketCode(eventId.slice(0, 4).toUpperCase()),
              },
            });
          };

          await createTicket(baseData.name, baseData.personalEmail, baseData.regNo, baseData.collegeEmail);
          imported += 1;

          if (ticketType.endsWith("DUO")) {
            const duoName = row["second participant details(for duo tickets) name"] || row["name"] || "";
            const duoEmail = row["second participant details(for duo tickets) email id"] || row["email id"] || "";
            const duoRegNo = row["second participant details(for duo tickets) registartion no"] || row["registartion no"] || "";
            const duoCollegeEmail = row["second participant details(for duo tickets) college email id"] || row["college email id"] || "";
            if (duoName && duoEmail) {
              await createTicket(duoName, duoEmail, duoRegNo, duoCollegeEmail);
              imported += 1;
            } else {
              errors.push(`Row ${index + 1}: missing second participant info`);
              skipped += 1;
            }
          }
        } catch (error) {
          logWarn(`importService:${source}`, `Row ${index + 1} failed`, error);
          errors.push(`Row ${index + 1}: failed to import`);
          skipped += 1;
        }
      }

      logInfo(`importService:${source}`, `Imported ${imported}, skipped ${skipped}`);
      return { imported, skipped, errors };
    } catch (error) {
      logWarn(`importService:${source}`, "Failed to import rows", error);
      throw error;
    }
  },
};
