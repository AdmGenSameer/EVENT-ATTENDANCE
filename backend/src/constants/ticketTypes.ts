export const TICKET_PRICES = {
  GUEST: 650,
  COUPLE: 1198,
  STUDENT: 950,
  CHILD: 1550,
} as const;

export type TicketType = keyof typeof TICKET_PRICES;
