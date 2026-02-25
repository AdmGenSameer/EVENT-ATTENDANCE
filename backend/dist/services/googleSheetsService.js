"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleSheetsService = void 0;
const googleapis_1 = require("googleapis");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const buildAuthClient = () => {
    try {
        if (!env_1.env.googleSheetsClientEmail || !env_1.env.googleSheetsPrivateKey) {
            throw new Error("Missing Google Sheets service account credentials");
        }
        const privateKey = env_1.env.googleSheetsPrivateKey.replace(/\\n/g, "\n");
        return new googleapis_1.google.auth.JWT({
            email: env_1.env.googleSheetsClientEmail,
            key: privateKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
            projectId: env_1.env.googleSheetsProjectId || undefined,
        });
    }
    catch (error) {
        (0, logger_1.logWarn)("googleSheets:auth", "Failed to build auth client", error);
        throw error;
    }
};
exports.googleSheetsService = {
    async fetchSheetRows(sheetId, rangeOverride) {
        try {
            (0, logger_1.logInfo)("googleSheets:fetch", `Fetching rows for sheet ${sheetId}`);
            const authClient = buildAuthClient();
            const sheets = googleapis_1.google.sheets({ version: "v4", auth: authClient });
            const range = rangeOverride || env_1.env.googleSheetsRange;
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range,
            });
            const values = response.data.values || [];
            if (!values.length) {
                return { rows: [], totalRows: 0, truncated: false };
            }
            const [headerRow, ...rows] = values;
            const headers = headerRow.map((header) => header?.toString().trim() || "");
            const mappedRows = rows.map((row) => {
                const record = {};
                headers.forEach((header, index) => {
                    if (header) {
                        record[header] = row[index]?.toString() ?? "";
                    }
                });
                return record;
            });
            const maxRows = env_1.env.googleSheetsMaxRows;
            const truncated = maxRows > 0 && mappedRows.length > maxRows;
            if (truncated) {
                (0, logger_1.logWarn)("googleSheets:fetch", `Row cap hit. Returning first ${maxRows} rows`, {
                    totalRows: mappedRows.length,
                });
            }
            return {
                rows: truncated ? mappedRows.slice(0, maxRows) : mappedRows,
                totalRows: mappedRows.length,
                truncated,
            };
        }
        catch (error) {
            (0, logger_1.logWarn)("googleSheets:fetch", "Failed to fetch sheet rows", error);
            throw error;
        }
    },
};
