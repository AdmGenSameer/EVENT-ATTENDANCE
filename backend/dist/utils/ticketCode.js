"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTicketCode = void 0;
const crypto_1 = __importDefault(require("crypto"));
const generateTicketCode = (prefix) => {
    const random = crypto_1.default.randomBytes(4).toString("hex").toUpperCase();
    return `${prefix}-${random}`;
};
exports.generateTicketCode = generateTicketCode;
