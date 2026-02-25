"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = void 0;
const jose_1 = require("jose");
const env_1 = require("../config/env");
const logger_1 = require("../utils/logger");
const getRoleFromPayload = (payload) => {
    try {
        const appMetadata = payload.app_metadata;
        const role = appMetadata?.role;
        return role || null;
    }
    catch (error) {
        (0, logger_1.logWarn)("auth:role", "Failed to read role claim", error);
        return null;
    }
};
const getJwtFromRequest = (req) => {
    try {
        const authHeader = req.headers.authorization || "";
        if (!authHeader.startsWith("Bearer ")) {
            return null;
        }
        return authHeader.replace("Bearer ", "").trim();
    }
    catch (error) {
        (0, logger_1.logWarn)("auth:token", "Failed to parse bearer token", error);
        return null;
    }
};
const jwks = env_1.env.supabaseJwksUrl
    ? (0, jose_1.createRemoteJWKSet)(new URL(env_1.env.supabaseJwksUrl))
    : null;
const requireAdmin = async (req, res, next) => {
    try {
        if (!jwks || !env_1.env.supabaseJwtIssuer) {
            (0, logger_1.logWarn)("auth:config", "Supabase JWT config missing");
            return res.status(500).json({ error: "Auth not configured" });
        }
        const token = getJwtFromRequest(req);
        if (!token) {
            (0, logger_1.logWarn)("auth:token", "Missing bearer token");
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { payload } = await (0, jose_1.jwtVerify)(token, jwks, {
            issuer: env_1.env.supabaseJwtIssuer,
            audience: env_1.env.supabaseJwtAudience,
        });
        const role = getRoleFromPayload(payload);
        if (!role || role !== env_1.env.supabaseAdminRole) {
            (0, logger_1.logWarn)("auth:role", `Role ${role ?? "none"} not permitted`);
            return res.status(403).json({ error: "Forbidden" });
        }
        (0, logger_1.logInfo)("auth:ok", `Authorized ${payload.sub}`);
        return next();
    }
    catch (error) {
        (0, logger_1.logWarn)("auth:verify", "JWT verification failed", error);
        return res.status(401).json({ error: "Unauthorized" });
    }
};
exports.requireAdmin = requireAdmin;
