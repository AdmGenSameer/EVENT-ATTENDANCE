export const TICKET_PRICES = {
  REGULAR_SINGLE: 650,
  REGULAR_DUO: 1198,
  FRONT_SINGLE: 950,
  FRONT_DUO: 1550,
} as const;

export type TicketType = keyof typeof TICKET_PRICES;
