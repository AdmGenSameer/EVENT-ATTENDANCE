import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "",
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

export const requireEnv = (name: keyof typeof env) => {
  const value = env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};
