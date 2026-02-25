"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventService = void 0;
const Event_1 = require("../db/models/Event");
const logger_1 = require("../utils/logger");
const ticketCode_1 = require("../utils/ticketCode");
const crypto_1 = __importDefault(require("crypto"));
const createKeyPair = () => {
    const { publicKey, privateKey } = crypto_1.default.generateKeyPairSync("ed25519");
    return {
        publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
        privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    };
};
exports.eventService = {
    async listEvents() {
        try {
            (0, logger_1.logInfo)("eventService:list", "Listing events");
            return await Event_1.Event.find().sort({ createdAt: -1 });
        }
        catch (error) {
            (0, logger_1.logWarn)("eventService:list", "Failed to list events", error);
            throw error;
        }
    },
    async getEvent(eventId) {
        try {
            (0, logger_1.logInfo)("eventService:get", `Loading event ${eventId}`);
            return await Event_1.Event.findById(eventId);
        }
        catch (error) {
            (0, logger_1.logWarn)("eventService:get", "Failed to load event", error);
            throw error;
        }
    },
    async getEventBySlug(slug) {
        try {
            (0, logger_1.logInfo)("eventService:getBySlug", `Loading event ${slug}`);
            return await Event_1.Event.findOne({ slug });
        }
        catch (error) {
            (0, logger_1.logWarn)("eventService:getBySlug", "Failed to load event", error);
            throw error;
        }
    },
    async createEvent(payload) {
        try {
            (0, logger_1.logInfo)("eventService:create", `Creating event ${payload.slug}`);
            const keys = createKeyPair();
            return await Event_1.Event.create({
                name: payload.name,
                slug: payload.slug,
                date: new Date(payload.date),
                location: payload.location || "",
                sheetId: payload.sheetId || "",
                qrPublicKey: keys.publicKey,
                description: "",
                status: "DRAFT",
            });
        }
        catch (error) {
            (0, logger_1.logWarn)("eventService:create", "Failed to create event", error);
            throw error;
        }
    },
    async updateEvent(eventId, payload) {
        try {
            (0, logger_1.logInfo)("eventService:update", `Updating event ${eventId}`);
            const event = await Event_1.Event.findById(eventId);
            if (!event) {
                return null;
            }
            return await Event_1.Event.findByIdAndUpdate(eventId, {
                name: payload.name ?? event.name,
                slug: payload.slug ?? event.slug,
                date: payload.date ? new Date(payload.date) : event.date,
                location: payload.location ?? event.location,
                sheetId: payload.sheetId ?? event.sheetId,
            }, { new: true });
        }
        catch (error) {
            (0, logger_1.logWarn)("eventService:update", "Failed to update event", error);
            throw error;
        }
    },
    async generateTicketCode(prefix) {
        try {
            (0, logger_1.logInfo)("eventService:ticketCode", `Generating ticket code for ${prefix}`);
            return (0, ticketCode_1.generateTicketCode)(prefix);
        }
        catch (error) {
            (0, logger_1.logWarn)("eventService:ticketCode", "Failed to generate ticket code", error);
            throw error;
        }
    },
};
