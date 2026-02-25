"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireEnv = exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.env = {
    port: Number(process.env.PORT || 4000),
    MONGODB_URI: process.env.MONGODB_URI || "",
    supabaseJwtIssuer: process.env.SUPABASE_JWT_ISSUER || "",
    supabaseJwtAudience: process.env.SUPABASE_JWT_AUDIENCE || "authenticated",
    supabaseJwksUrl: process.env.SUPABASE_JWKS_URL || "",
    supabaseAdminRole: process.env.SUPABASE_ADMIN_ROLE || "admin",
    googleSheetsClientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "",
    googleSheetsPrivateKey: process.env.GOOGLE_SHEETS_PRIVATE_KEY || "",
    googleSheetsProjectId: process.env.GOOGLE_SHEETS_PROJECT_ID || "",
    googleSheetsRange: process.env.GOOGLE_SHEETS_RANGE || "Form Responses 1",
    googleSheetsMaxRows: Number(process.env.GOOGLE_SHEETS_MAX_ROWS || 2000),
};
const requireEnv = (name) => {
    const value = exports.env[name];
    if (!value) {
        throw new Error(`Missing required env var: ${name}`);
    }
    return value;
};
exports.requireEnv = requireEnv;
