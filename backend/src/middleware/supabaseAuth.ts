import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { env } from "../config/env";
import { logInfo, logWarn } from "../utils/logger";

const getRoleFromPayload = (payload: JWTPayload) => {
  try {
    const appMetadata = payload.app_metadata as Record<string, unknown> | undefined;
    const role = appMetadata?.role as string | undefined;
    return role || null;
  } catch (error) {
    logWarn("auth:role", "Failed to read role claim", error);
    return null;
  }
};

const getJwtFromRequest = (req: Request) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.replace("Bearer ", "").trim();
  } catch (error) {
    logWarn("auth:token", "Failed to parse bearer token", error);
    return null;
  }
};

const jwks = env.supabaseJwksUrl
  ? createRemoteJWKSet(new URL(env.supabaseJwksUrl))
  : null;

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!jwks || !env.supabaseJwtIssuer) {
      logWarn("auth:config", "Supabase JWT config missing");
      return res.status(500).json({ error: "Auth not configured" });
    }

    const token = getJwtFromRequest(req);
    if (!token) {
      logWarn("auth:token", "Missing bearer token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.supabaseJwtIssuer,
      audience: env.supabaseJwtAudience,
    });

    const role = getRoleFromPayload(payload);
    if (!role || role !== env.supabaseAdminRole) {
      logWarn("auth:role", `Role ${role ?? "none"} not permitted`);
      return res.status(403).json({ error: "Forbidden" });
    }

    logInfo("auth:ok", `Authorized ${payload.sub}`);
    return next();
  } catch (error) {
    logWarn("auth:verify", "JWT verification failed", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
