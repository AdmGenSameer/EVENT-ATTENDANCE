import { Router } from "express";
import { healthRouter } from "./health";
import { eventsRouter } from "./events";
import { ticketsRouter } from "./tickets";
import { scannerRouter } from "./scanner";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(eventsRouter);
apiRouter.use(ticketsRouter);
apiRouter.use(scannerRouter);
