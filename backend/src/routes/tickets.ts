import { Router } from "express";
import { ticketService } from "../services/ticketService";
import { logInfo, logWarn } from "../utils/logger";

export const ticketsRouter = Router();

ticketsRouter.get("/events/:id/tickets", async (req, res) => {
  try {
    const eventId = req.params.id;
    logInfo("tickets:list", `Fetching tickets for ${eventId}`);
    const tickets = await ticketService.listTickets(eventId);
    res.json({ tickets });
  } catch (error) {
    logWarn("tickets:list", "Failed to list tickets", error);
    res.status(500).json({ error: "Failed to list tickets" });
  }
});
