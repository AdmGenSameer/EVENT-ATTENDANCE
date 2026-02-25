"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsv = void 0;
const sync_1 = require("csv-parse/sync");
const parseCsv = (csvText) => {
    const records = (0, sync_1.parse)(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });
    return records.map((row) => {
        const normalized = {};
        for (const [key, value] of Object.entries(row)) {
            normalized[key.trim()] = value?.trim?.() ?? "";
        }
        return normalized;
    });
};
exports.parseCsv = parseCsv;
