"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logError = exports.logWarn = exports.logInfo = void 0;
const formatPayload = (payload) => {
    if (payload === undefined) {
        return "";
    }
    if (typeof payload === "string") {
        return payload;
    }
    try {
        return JSON.stringify(payload);
    }
    catch {
        return String(payload);
    }
};
const logInfo = (context, message, payload) => {
    const data = formatPayload(payload);
    const suffix = data ? ` | ${data}` : "";
    console.info(`[INFO] ${context} - ${message}${suffix}`);
};
exports.logInfo = logInfo;
const logWarn = (context, message, error) => {
    const detail = error instanceof Error ? error.message : formatPayload(error);
    const suffix = detail ? ` | ${detail}` : "";
    console.warn(`[WARN] ${context} - ${message}${suffix}`);
};
exports.logWarn = logWarn;
const logError = (context, message, error) => {
    const detail = error instanceof Error ? error.message : formatPayload(error);
    const suffix = detail ? ` | ${detail}` : "";
    console.error(`[ERROR] ${context} - ${message}${suffix}`);
};
exports.logError = logError;
