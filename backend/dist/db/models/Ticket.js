"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ticket = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DuoParticipantSchema = new mongoose_1.Schema({
    participantNumber: Number,
    fullName: String,
    status: String,
}, { _id: false });
const TicketSchema = new mongoose_1.Schema({
    eventId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    ticketCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    name: {
        type: String,
        required: true,
    },
    personalEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    registrationNo: {
        type: String,
        default: null,
    },
    contactNo: {
        type: String,
        default: null,
    },
    ticketType: {
        type: String,
        enum: ['REGULAR', 'REGULAR DUO', 'FRONT ROW SOLO', 'FRONT ROW DUO'],
        required: true,
    },
    checkedIn: {
        type: Boolean,
        default: false,
    },
    checkedInAt: {
        type: Date,
        default: null,
    },
    checkInTime: {
        type: Date,
        default: null,
    },
    checkInBy: {
        type: String,
        default: null,
    },
    seatNumber: {
        type: String,
        default: null,
    },
    qrData: {
        type: String,
        default: null,
    },
    duoParticipants: [DuoParticipantSchema],
}, {
    timestamps: true,
});
TicketSchema.index({ eventId: 1, ticketCode: 1 });
// ticketCode index is already created by unique: true and index: true
TicketSchema.index({ eventId: 1, checkedIn: 1 });
TicketSchema.index({ seatNumber: 1 });
exports.Ticket = mongoose_1.default.model('Ticket', TicketSchema);
