import { SyncJob } from "../db/models/SyncJob";
import { logInfo, logWarn } from "../utils/logger";
import { Types } from "mongoose";

type SyncJobCreateInput = {
  eventId: string;
  source: string;
  sheetId?: string;
};

type SyncJobUpdateInput = {
  status: string;
  imported: number;
  skipped: number;
  errorCount: number;
  errors: string[];
  rowCount: number;
  totalRows: number;
  truncated: boolean;
};

export const syncHistoryService = {
  async createJob(payload: SyncJobCreateInput) {
    try {
      logInfo("syncHistory:create", `Creating sync job for ${payload.eventId}`);
      return await SyncJob.create({
        eventId: new Types.ObjectId(payload.eventId),
        source: payload.source,
        sheetId: payload.sheetId,
        status: "running",
      });
    } catch (error) {
      logWarn("syncHistory:create", "Failed to create sync job", error);
      throw error;
    }
  },

  async completeJob(jobId: string, payload: SyncJobUpdateInput) {
    try {
      logInfo("syncHistory:complete", `Completing sync job ${jobId}`);
      return await SyncJob.findByIdAndUpdate(
        jobId,
        {
          status: payload.status,
          imported: payload.imported,
          skipped: payload.skipped,
          errorCount: payload.errorCount,
          errors: payload.errors,
          rowCount: payload.rowCount,
          totalRows: payload.totalRows,
          truncated: payload.truncated,
          finishedAt: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      logWarn("syncHistory:complete", "Failed to complete sync job", error);
      throw error;
    }
  },

  async failJob(jobId: string, reason: string) {
    try {
      logInfo("syncHistory:fail", `Failing sync job ${jobId}`);
      return await SyncJob.findByIdAndUpdate(
        jobId,
        {
          status: "failed",
          errors: [reason],
          errorCount: 1,
          finishedAt: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      logWarn("syncHistory:fail", "Failed to fail sync job", error);
      throw error;
    }
  },

  async listJobs(eventId: string, limit = 20) {
    try {
      logInfo("syncHistory:list", `Listing sync jobs for ${eventId}`);
      return await SyncJob.find({
        eventId: new Types.ObjectId(eventId),
      }).sort({ startedAt: -1 }).limit(limit);
    } catch (error) {
      logWarn("syncHistory:list", "Failed to list sync jobs", error);
      throw error;
    }
  },
};
