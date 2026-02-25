"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncHistoryService = void 0;
const SyncJob_1 = require("../db/models/SyncJob");
const logger_1 = require("../utils/logger");
const mongoose_1 = require("mongoose");
exports.syncHistoryService = {
    async createJob(payload) {
        try {
            (0, logger_1.logInfo)("syncHistory:create", `Creating sync job for ${payload.eventId}`);
            return await SyncJob_1.SyncJob.create({
                eventId: new mongoose_1.Types.ObjectId(payload.eventId),
                source: payload.source,
                sheetId: payload.sheetId,
                status: "running",
            });
        }
        catch (error) {
            (0, logger_1.logWarn)("syncHistory:create", "Failed to create sync job", error);
            throw error;
        }
    },
    async completeJob(jobId, payload) {
        try {
            (0, logger_1.logInfo)("syncHistory:complete", `Completing sync job ${jobId}`);
            return await SyncJob_1.SyncJob.findByIdAndUpdate(jobId, {
                status: payload.status,
                imported: payload.imported,
                skipped: payload.skipped,
                errorCount: payload.errorCount,
                errors: payload.errors,
                rowCount: payload.rowCount,
                totalRows: payload.totalRows,
                truncated: payload.truncated,
                finishedAt: new Date(),
            }, { new: true });
        }
        catch (error) {
            (0, logger_1.logWarn)("syncHistory:complete", "Failed to complete sync job", error);
            throw error;
        }
    },
    async failJob(jobId, reason) {
        try {
            (0, logger_1.logInfo)("syncHistory:fail", `Failing sync job ${jobId}`);
            return await SyncJob_1.SyncJob.findByIdAndUpdate(jobId, {
                status: "failed",
                errors: [reason],
                errorCount: 1,
                finishedAt: new Date(),
            }, { new: true });
        }
        catch (error) {
            (0, logger_1.logWarn)("syncHistory:fail", "Failed to fail sync job", error);
            throw error;
        }
    },
    async listJobs(eventId, limit = 20) {
        try {
            (0, logger_1.logInfo)("syncHistory:list", `Listing sync jobs for ${eventId}`);
            return await SyncJob_1.SyncJob.find({
                eventId: new mongoose_1.Types.ObjectId(eventId),
            }).sort({ startedAt: -1 }).limit(limit);
        }
        catch (error) {
            (0, logger_1.logWarn)("syncHistory:list", "Failed to list sync jobs", error);
            throw error;
        }
    },
};
