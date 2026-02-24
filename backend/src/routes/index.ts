import { Router } from "express";
import { healthRouter } from "./health";
import { eventsRouter } from "./events";
import { ticketsRouter } from "./tickets";
import { scannerRouter } from "./scanner";
import { requireAdmin } from "../middleware/supabaseAuth";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(requireAdmin, eventsRouter);
apiRouter.use(requireAdmin, ticketsRouter);
apiRouter.use(scannerRouter);
