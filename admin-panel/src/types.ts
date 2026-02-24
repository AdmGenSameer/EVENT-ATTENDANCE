export type EventStatus = "DRAFT" | "ACTIVE" | "COMPLETED";

export type EventRecord = {
  id: string;
  name: string;
  slug: string;
  date: string;
  venue?: string | null;
  sheetId?: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
};

export type EventPayload = {
  name: string;
  slug: string;
  date: string;
  venue?: string;
  sheetId?: string;
};

export type SyncJob = {
  id: string;
  eventId: string;
  source: string;
  sheetId?: string | null;
  status: string;
  imported: number;
  skipped: number;
  errorCount: number;
  errors?: string[] | null;
  rowCount: number;
  totalRows: number;
  truncated: boolean;
  startedAt: string;
  finishedAt?: string | null;
};

export type TicketRecord = {
  id: string;
  eventId: string;
  ticketCode: string;
  name: string;
  personalEmail: string;
  ticketType: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  createdAt: string;
  qrData?: string | null;
};
