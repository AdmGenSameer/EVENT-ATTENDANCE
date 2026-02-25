import { Event } from "../db/models/Event";
import { logInfo, logWarn } from "../utils/logger";
import { generateTicketCode } from "../utils/ticketCode";
import crypto from "crypto";

const createKeyPair = () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
};

export const eventService = {
  async listEvents() {
    try {
      logInfo("eventService:list", "Listing events");
      return await Event.find().sort({ createdAt: -1 });
    } catch (error) {
      logWarn("eventService:list", "Failed to list events", error);
      throw error;
    }
  },

  async getEvent(eventId: string) {
    try {
      logInfo("eventService:get", `Loading event ${eventId}`);
      return await Event.findById(eventId);
    } catch (error) {
      logWarn("eventService:get", "Failed to load event", error);
      throw error;
    }
  },

  async getEventBySlug(slug: string) {
    try {
      logInfo("eventService:getBySlug", `Loading event ${slug}`);
      return await Event.findOne({ slug });
    } catch (error) {
      logWarn("eventService:getBySlug", "Failed to load event", error);
      throw error;
    }
  },

  async createEvent(payload: {
    name: string;
    slug: string;
    date: string;
    location?: string;
    sheetId?: string;
  }) {
    try {
      logInfo("eventService:create", `Creating event ${payload.slug}`);
      const keys = createKeyPair();
      return await Event.create({
        name: payload.name,
        slug: payload.slug,
        date: new Date(payload.date),
        location: payload.location || "",
        sheetId: payload.sheetId || "",
        qrPublicKey: keys.publicKey,
        description: "",
        status: "DRAFT",
      });
    } catch (error) {
      logWarn("eventService:create", "Failed to create event", error);
      throw error;
    }
  },

  async updateEvent(eventId: string, payload: Partial<{ name: string; slug: string; date: string; location?: string; sheetId?: string }>) {
    try {
      logInfo("eventService:update", `Updating event ${eventId}`);
      const event = await Event.findById(eventId);
      if (!event) {
        return null;
      }
      return await Event.findByIdAndUpdate(
        eventId,
        {
          name: payload.name ?? event.name,
          slug: payload.slug ?? event.slug,
          date: payload.date ? new Date(payload.date) : event.date,
          location: payload.location ?? event.location,
          sheetId: payload.sheetId ?? event.sheetId,
        },
        { new: true }
      );
    } catch (error) {
      logWarn("eventService:update", "Failed to update event", error);
      throw error;
    }
  },

  async generateTicketCode(prefix: string) {
    try {
      logInfo("eventService:ticketCode", `Generating ticket code for ${prefix}`);
      return generateTicketCode(prefix);
    } catch (error) {
      logWarn("eventService:ticketCode", "Failed to generate ticket code", error);
      throw error;
    }
  },
};
