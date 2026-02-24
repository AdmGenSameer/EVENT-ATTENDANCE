import { google } from "googleapis";
import { env } from "../config/env";
import { logInfo, logWarn } from "../utils/logger";

const buildAuthClient = () => {
  try {
    if (!env.googleSheetsClientEmail || !env.googleSheetsPrivateKey) {
      throw new Error("Missing Google Sheets service account credentials");
    }

    const privateKey = env.googleSheetsPrivateKey.replace(/\\n/g, "\n");

    return new google.auth.JWT({
      email: env.googleSheetsClientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      projectId: env.googleSheetsProjectId || undefined,
    });
  } catch (error) {
    logWarn("googleSheets:auth", "Failed to build auth client", error);
    throw error;
  }
};

export const googleSheetsService = {
  async fetchSheetRows(sheetId: string, rangeOverride?: string) {
    try {
      logInfo("googleSheets:fetch", `Fetching rows for sheet ${sheetId}`);
      const authClient = buildAuthClient();
      const sheets = google.sheets({ version: "v4", auth: authClient });
      const range = rangeOverride || env.googleSheetsRange;
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });

      const values = response.data.values || [];
      if (!values.length) {
        return { rows: [] as Record<string, string>[], totalRows: 0, truncated: false };
      }

      const [headerRow, ...rows] = values;
      const headers = headerRow.map((header) => header?.toString().trim() || "");

      const mappedRows = rows.map((row) => {
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (header) {
            record[header] = row[index]?.toString() ?? "";
          }
        });
        return record;
      });

      const maxRows = env.googleSheetsMaxRows;
      const truncated = maxRows > 0 && mappedRows.length > maxRows;
      if (truncated) {
        logWarn("googleSheets:fetch", `Row cap hit. Returning first ${maxRows} rows`, {
          totalRows: mappedRows.length,
        });
      }

      return {
        rows: truncated ? mappedRows.slice(0, maxRows) : mappedRows,
        totalRows: mappedRows.length,
        truncated,
      };
    } catch (error) {
      logWarn("googleSheets:fetch", "Failed to fetch sheet rows", error);
      throw error;
    }
  },
};
