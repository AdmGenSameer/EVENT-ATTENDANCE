import crypto from "crypto";

export const generateTicketCode = (prefix: string) => {
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
};
