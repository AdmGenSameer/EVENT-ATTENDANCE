import { Router } from "express";
import { ticketService } from "../services/ticketService";
import { importService } from "../services/importService";
import { qrService } from "../services/qrService";
import { googleSheetsService } from "../services/googleSheetsService";
import { logInfo, logWarn } from "../utils/logger";
import multer from "multer";
import { parseCsv } from "../utils/csv";
import { Ticket } from "../db/models/Ticket";
import { Participants } from "../db/models/ParticipantsModel"; 

export const ticketsRouter = Router();

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/tickets/:regNo
// Fetch ticket by registration number (path parameter)
ticketsRouter.get("/:regNo", async (req, res) => {
  try {
    let { regNo } = req.params;
    const participant = await Ticket.findOne({
      registrationNo: { $regex: new RegExp(`^${regNo}$`, "i") },
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
  } catch (error) {
    console.error("Error fetching participant:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch participant",
    });
  }
});

// GET /api/tickets/fetch?email=...
// Fetch ticket by email
ticketsRouter.get("/fetch", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, error: "Email required" });

    const participant = await Ticket.findOne({
      personalEmail: (email as string).toLowerCase().trim(),
    }).lean();

    if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch participant" });
  }
});

// GET /api/tickets/fetch-by-reg?regNo=...
// Fetch ticket by registration number (query parameter)
ticketsRouter.get("/fetch-by-reg", async (req, res) => {
  try {
    const { regNo } = req.query;
    if (!regNo) return res.status(400).json({ success: false, error: "Registration number required" });

    const participant = await Ticket.findOne({
      registrationNo: (regNo as string).trim(),
    }).lean();

    if (!participant) return res.status(404).json({ success: false, error: "Participant not found" });

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to fetch participant" });
  }
});

ticketsRouter.get("/events/:id/tickets", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("tickets:list", `Fetching tickets for ${eventId}`);
    const tickets = await ticketService.listTickets(eventId);
    const normalized = tickets.map((ticket: any) => ({
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
  } catch (error) {
    logWarn("tickets:list", "Failed to list tickets", error);
    res.status(500).json({ error: "Failed to list tickets" });
  }
});

/**
 * POST /api/tickets/import
 * Upload CSV/Excel file with participant data
 * Supports: registration sheet format
 */
ticketsRouter.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const eventId = req.body.eventId;
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    logInfo("tickets:import", `Importing file for event ${eventId}`);

    // Convert buffer to CSV text
    const csvText = req.file.buffer.toString("utf-8");

    // Parse and import
    const result = await importService.importTicketsFromCsv(eventId, csvText);

    logInfo("tickets:import", `Import result: ${result.imported} imported, ${result.skipped} skipped`);
    res.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    logWarn("tickets:import", "Import failed", error);
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
ticketsRouter.post("/add-participant", async (req, res) => {
  try {
    const { eventId, name, email, ticketType, duo } = req.body;

    if (!eventId || !name || !email || !ticketType) {
      return res.status(400).json({
        error: "Missing required fields: eventId, name, email, ticketType",
      });
    }

    logInfo("tickets:add-participant", `Adding participant ${name} for event ${eventId}`);

    const result = await importService.addParticipant(eventId, {
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
  } catch (error) {
    logWarn("tickets:add-participant", "Failed to add participant", error);
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
ticketsRouter.post("/events/:eventId/qr/generate-single", async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) {
      return res.status(400).json({ error: "Ticket ID is required" });
    }

    logInfo("tickets:qr-single", `Generating QR for ticket ${ticketId}`);

    const result = await qrService.generateSingleQR(ticketId);

    res.json(result);
  } catch (error) {
    logWarn("tickets:qr-single", "Failed to generate QR", error);
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
ticketsRouter.post("/events/:eventId/qr/generate-bulk", async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    logInfo("tickets:qr-bulk", `Starting bulk QR generation for event ${eventId}`);

    const result = await qrService.generateBulkQRs(eventId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logWarn("tickets:qr-bulk", "Bulk QR generation failed", error);
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
ticketsRouter.post("/events/:eventId/qr/clear", async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    logInfo("tickets:qr-clear", `Clearing QR data for event ${eventId}`);

    const result = await qrService.clearEventQrData(eventId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logWarn("tickets:qr-clear", "Clear QR data failed", error);
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
ticketsRouter.get("/events/:eventId/qr/public-key", async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) {
      return res.status(400).json({ error: "Event ID is required" });
    }

    logInfo("tickets:public-key", `Getting public key for event ${eventId}`);

    const result = await qrService.getEventPublicKey(eventId);

    res.json(result);
  } catch (error) {
    logWarn("tickets:public-key", "Failed to get public key", error);
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
ticketsRouter.post("/verify", async (req, res) => {
  try {
    const { qrData, publicKey } = req.body;
    if (!qrData || !publicKey) {
      return res.status(400).json({ error: "QR data and public key are required" });
    }

    logInfo("tickets:verify", "Verifying QR signature");

    const result = await qrService.verifyQRSignature(qrData, publicKey);

    res.json(result);
  } catch (error) {
    logWarn("tickets:verify", "QR verification failed", error);
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
ticketsRouter.post("/sync-google-sheets", async (req, res) => {
  try {
    const { eventId, sheetId } = req.body;

    if (!eventId || !sheetId) {
      return res.status(400).json({ error: "Event ID and Sheet ID are required" });
    }

    logInfo("tickets:sync-sheets", `Syncing from Google Sheet ${sheetId} for event ${eventId}`);

    // Fetch rows from Google Sheets
    const sheetsData = await googleSheetsService.fetchSheetRows(sheetId);

    if (!sheetsData.rows || sheetsData.rows.length === 0) {
      return res.status(400).json({ error: "No data found in Google Sheet" });
    }

    // Log available columns for debugging
    if (sheetsData.rows.length > 0) {
      const sampleRow = sheetsData.rows[0];
      const columns = Object.keys(sampleRow);
      logInfo("tickets:sync-sheets", `Found ${columns.length} columns: ${columns.join(", ")}`);
      
      // Log first row data for debugging
      logInfo("tickets:sync-sheets", `First row data: ${JSON.stringify(sampleRow).substring(0, 200)}`);
    }

    // Convert Google Sheets rows to CSV format and import
    // Map sheet columns to expected import format
    const importedRows: any[] = [];
    const skippedRows: any[] = [];
    const errorsList: string[] = [];

    // Helper function to find column value with flexible matching
    const findColumnValue = (row: Record<string, string>, possibleNames: string[]): string => {
      for (const name of possibleNames) {
        if (row[name]) return row[name];
      }
      // Try case-insensitive match
      const keys = Object.keys(row);
      for (const name of possibleNames) {
        const match = keys.find(k => k.toLowerCase() === name.toLowerCase());
        if (match && row[match]) return row[match];
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
          logInfo("tickets:sync-sheets", `Row ${i + 1} - name: "${name}", email: "${email}", ticketType: "${ticketType}"`);
          logInfo("tickets:sync-sheets", `Row ${i + 1} - Available keys: ${Object.keys(row).join(", ")}`);
        }

        if (!name || !email || !ticketType) {
          skippedRows.push(i + 1);
          errorsList.push(`Row ${i + 1}: Missing required fields (NAME, EMAIL, TICKET TYPE)`);
          continue;
        }

        // Add participant
        const result = await importService.addParticipant(eventId, {
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
      } catch (error) {
        errorsList.push(
          `Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        skippedRows.push(i + 1);
      }
    }

    logInfo(
      "tickets:sync-sheets",
      `Sync complete: ${importedRows.length} imported, ${skippedRows.length} skipped`
    );

    res.json({
      success: true,
      imported: importedRows.length,
      skipped: skippedRows.length,
      errors: errorsList.slice(0, 50), // Limit errors shown
      totalRows: sheetsData.rows.length,
    });
  } catch (error) {
    logWarn("tickets:sync-sheets", "Google Sheets sync failed", error);
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
ticketsRouter.delete("/events/:eventId/clear", async (req, res) => {
  try {
    const { eventId } = req.params;
    
    logInfo("tickets:clear", `Clearing all tickets for event ${eventId}`);
    
    const result = await Ticket.deleteMany({ eventId });
    
    logInfo("tickets:clear", `Deleted ${result.deletedCount} tickets`);
    
    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} tickets`,
    });
  } catch (error) {
    logWarn("tickets:clear", "Failed to clear tickets", error);
    res.status(500).json({
      error: "Failed to clear tickets",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
