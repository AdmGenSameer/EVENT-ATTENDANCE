import { EventPayload, EventRecord, SyncJob, TicketRecord, Seat, LiveRegistrationStatus } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  try {
    console.info("[api] request", { path, options });
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("[api] error", { path, status: response.status, errorText });
      throw new Error(errorText || "Request failed");
    }

    return (await response.json()) as T;
  } catch (error) {
    console.warn("[api] request failed", error);
    throw error;
  }
};

export const getEvents = async (): Promise<EventRecord[]> => {
  try {
    const data = await request<{ events: EventRecord[] }>("/events");
    return data.events;
  } catch (error) {
    console.warn("[api] getEvents failed", error);
    throw error;
  }
};

export const createEvent = async (payload: EventPayload): Promise<EventRecord> => {
  try {
    const data = await request<{ event: EventRecord }>("/events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return data.event;
  } catch (error) {
    console.warn("[api] createEvent failed", error);
    throw error;
  }
};

export const updateEvent = async (eventId: string, payload: Partial<EventPayload>): Promise<EventRecord> => {
  try {
    const data = await request<{ event: EventRecord }>(`/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return data.event;
  } catch (error) {
    console.warn("[api] updateEvent failed", error);
    throw error;
  }
};

export type SyncSheetResult = {
  result: { imported: number; skipped: number; errors: string[] };
  rowCount: number;
  totalRows: number;
  truncated: boolean;
};

export const syncGoogleSheet = async (eventId: string, sheetId?: string): Promise<SyncSheetResult> => {
  try {
    const data = await request<SyncSheetResult>(`/events/${eventId}/sync-google-sheet`, {
      method: "POST",
      body: JSON.stringify(sheetId ? { sheetId } : {}),
    });
    return data;
  } catch (error) {
    console.warn("[api] syncGoogleSheet failed", error);
    throw error;
  }
};

export const getSyncHistory = async (eventId: string): Promise<SyncJob[]> => {
  try {
    const data = await request<{ jobs: SyncJob[] }>(`/events/${eventId}/sync-history`);
    return data.jobs;
  } catch (error) {
    console.warn("[api] getSyncHistory failed", error);
    throw error;
  }
};

export const getTickets = async (eventId: string): Promise<TicketRecord[]> => {
  try {
    const data = await request<{ tickets: TicketRecord[] }>(`/events/${eventId}/tickets`);
    return data.tickets;
  } catch (error) {
    console.warn("[api] getTickets failed", error);
    throw error;
  }
};

export const generateTickets = async (eventId: string, exp?: number, force?: boolean) => {
  try {
    const data = await request<{ result: { updated: number; skipped: number } }>(`/events/${eventId}/generate-tickets`, {
      method: "POST",
      body: JSON.stringify({ exp, force }),
    });
    return data.result;
  } catch (error) {
    console.warn("[api] generateTickets failed", error);
    throw error;
  }
};

// Live Registration APIs
export const getLiveStatus = async (eventId: string): Promise<LiveRegistrationStatus> => {
  try {
    const data = await request<LiveRegistrationStatus>(`/events/${eventId}/live-status`);
    return data;
  } catch (error) {
    console.warn("[api] getLiveStatus failed", error);
    throw error;
  }
};

export const setLiveStatus = async (eventId: string, isLive: boolean): Promise<LiveRegistrationStatus> => {
  try {
    const data = await request<LiveRegistrationStatus>(`/events/${eventId}/live-status`, {
      method: "POST",
      body: JSON.stringify({ isLive }),
    });
    return data;
  } catch (error) {
    console.warn("[api] setLiveStatus failed", error);
    throw error;
  }
};

// Seating APIs
export const getSeats = async (eventId: string): Promise<Seat[]> => {
  try {
    const data = await request<{ seats: Seat[] }>(`/events/${eventId}/seats`);
    return data.seats;
  } catch (error) {
    console.warn("[api] getSeats failed", error);
    throw error;
  }
};

export const blockSeat = async (eventId: string, seatId: string): Promise<Seat> => {
  try {
    const data = await request<{ seat: Seat }>(`/events/${eventId}/seats/${seatId}/block`, {
      method: "POST",
    });
    return data.seat;
  } catch (error) {
    console.warn("[api] blockSeat failed", error);
    throw error;
  }
};

export const unblockSeat = async (eventId: string, seatId: string): Promise<Seat> => {
  try {
    const data = await request<{ seat: Seat }>(`/events/${eventId}/seats/${seatId}/unblock`, {
      method: "POST",
    });
    return data.seat;
  } catch (error) {
    console.warn("[api] unblockSeat failed", error);
    throw error;
  }
};

// Generic API helper for Import component
export const api = {
  async post<T>(path: string, body: any): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  async delete<T>(path: string): Promise<T> {
    return request<T>(path, {
      method: "DELETE",
    });
  },
};
