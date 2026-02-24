import { useEffect, useState } from "react";
import { createEvent, generateTickets, getEvents, getSyncHistory, getTickets, syncGoogleSheet, updateEvent } from "./api";
import { EventPayload, EventRecord, SyncJob, TicketRecord } from "./types";
import { EventForm } from "./components/EventForm";
import { supabase } from "./supabaseClient";
import { QrPreview } from "./components/QrPreview";

const formatDateTime = (raw: string) => {
  try {
    return new Date(raw).toLocaleString();
  } catch (error) {
    console.warn("[App] formatDateTime failed", error);
    return raw;
  }
};

const toFormPayload = (event: EventRecord): EventPayload => {
  try {
    return {
      name: event.name,
      slug: event.slug,
      date: event.date?.slice(0, 16) || "",
      venue: event.venue || "",
      sheetId: event.sheetId || "",
    };
  } catch (error) {
    console.warn("[App] toFormPayload failed", error);
    return {
      name: "",
      slug: "",
      date: "",
      venue: "",
      sheetId: "",
    };
  }
};

const App = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EventRecord | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);
  const [syncHistoryEvent, setSyncHistoryEvent] = useState<EventRecord | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncJob[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [qrExpiry, setQrExpiry] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      console.info("[App] loading events");
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      console.warn("[App] loadEvents failed", err);
      setError("Failed to load events. Check logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSessionEmail(data.session?.user.email ?? null);
      } catch (err) {
        console.warn("[App] session load failed", err);
      }
    };

    initSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      try {
        setSessionEmail(newSession?.user.email ?? null);
      } catch (err) {
        console.warn("[App] auth state change failed", err);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sessionEmail) {
      loadEvents();
    }
  }, [sessionEmail]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    try {
      console.info("[Auth] login attempt", { authEmail });
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (signInError) {
        throw signInError;
      }
      setAuthPassword("");
    } catch (err) {
      console.warn("[Auth] login failed", err);
      setAuthError("Login failed. Check credentials.");
    }
  };

  const handleLogout = async () => {
    try {
      console.info("[Auth] logout");
      await supabase.auth.signOut();
      setEvents([]);
    } catch (err) {
      console.warn("[Auth] logout failed", err);
    }
  };

  const handleCreate = async (payload: EventPayload) => {
    try {
      console.info("[App] create event", payload);
      const created = await createEvent(payload);
      setEvents((prev) => [created, ...prev]);
    } catch (err) {
      console.warn("[App] create failed", err);
      throw err;
    }
  };

  const handleUpdate = async (payload: EventPayload) => {
    if (!selected) {
      return;
    }
    try {
      console.info("[App] update event", { id: selected.id, payload });
      const updated = await updateEvent(selected.id, payload);
      setEvents((prev) => prev.map((item) => (item.id === selected.id ? updated : item)));
      setSelected(null);
    } catch (err) {
      console.warn("[App] update failed", err);
      throw err;
    }
  };

  const handleSyncSheet = async (event: EventRecord) => {
    try {
      setSyncStatus(null);
      setSyncErrors([]);
      setIsSyncing(event.id);
      console.info("[App] sync sheet", { eventId: event.id });
      const result = await syncGoogleSheet(event.id, event.sheetId ?? undefined);
      const warning = result.truncated ? " (row cap reached)" : "";
      setSyncStatus(
        `Synced ${result.result.imported} tickets, skipped ${result.result.skipped}. Rows: ${result.rowCount}/${result.totalRows}${warning}`
      );
      setSyncErrors(result.result.errors || []);
      await loadSyncHistory(event);
      await loadEvents();
    } catch (err) {
      console.warn("[App] sync sheet failed", err);
      setSyncStatus("Sync failed. Check logs.");
    } finally {
      setIsSyncing(null);
    }
  };

  const loadSyncHistory = async (event: EventRecord) => {
    try {
      setSyncHistoryEvent(event);
      console.info("[App] load sync history", { eventId: event.id });
      const jobs = await getSyncHistory(event.id);
      setSyncHistory(jobs);
    } catch (err) {
      console.warn("[App] load sync history failed", err);
    }
  };

  const loadTickets = async (event: EventRecord) => {
    try {
      setTicketError(null);
      setTicketStatus("Loading tickets...");
      console.info("[App] load tickets", { eventId: event.id });
      const data = await getTickets(event.id);
      setTickets(data);
      setTicketStatus(`Loaded ${data.length} tickets.`);
    } catch (err) {
      console.warn("[App] load tickets failed", err);
      setTicketError("Failed to load tickets.");
      setTicketStatus(null);
    }
  };

  const handleViewEvent = async (event: EventRecord) => {
    try {
      setDetailEvent(event);
      await Promise.all([loadTickets(event), loadSyncHistory(event)]);
    } catch (err) {
      console.warn("[App] view event failed", err);
    }
  };

  const handleGenerateTickets = async () => {
    if (!detailEvent) {
      return;
    }
    try {
      setTicketError(null);
      setTicketStatus("Generating QR tokens...");
      const exp = qrExpiry ? Number(qrExpiry) : undefined;
      console.info("[App] generate tickets", { eventId: detailEvent.id, exp });
      const result = await generateTickets(detailEvent.id, Number.isNaN(exp ?? 0) ? undefined : exp);
      setTicketStatus(`Generated ${result.updated} tokens, skipped ${result.skipped}.`);
    } catch (err) {
      console.warn("[App] generate tickets failed", err);
      setTicketError("Failed to generate QR tokens.");
    }
  };

  if (!sessionEmail) {
    return (
      <main>
        <section>
          <h2>Admin Login</h2>
          <form onSubmit={handleLogin} className="grid">
            <div>
              <label>Email</label>
              <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required />
            </div>
            <div>
              <label>Password</label>
              <input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required />
            </div>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <button type="submit">Login</button>
            </div>
          </form>
          {authError ? <p className="status">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main>
      <header>
        <div>
          <h1>EventQR Admin</h1>
          <p className="status">Signed in as {sessionEmail}</p>
        </div>
        <div className="row">
          <button className="secondary" onClick={loadEvents} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button className="secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <EventForm title="Create Event" onSubmit={handleCreate} />

      {selected ? (
        <EventForm title={`Edit Event: ${selected.name}`} initial={toFormPayload(selected)} onSubmit={handleUpdate} />
      ) : null}

      <section>
        <h2>Events</h2>
        {error ? <p className="status">{error}</p> : null}
        {syncStatus ? <p className="status">{syncStatus}</p> : null}
        {syncErrors.length ? (
          <div>
            <p className="status">Import errors ({syncErrors.length})</p>
            <ul className="status">
              {syncErrors.slice(0, 10).map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="grid">
          {events.map((event) => (
            <div key={event.id} className="card">
              <h3>{event.name}</h3>
              <p className="status">{event.slug}</p>
              <p className="status">{formatDateTime(event.date)}</p>
              <p className="status">Status: {event.status}</p>
              <div className="row">
                <button className="secondary" onClick={() => setSelected(event)}>
                  Edit
                </button>
                <button className="secondary" onClick={() => handleSyncSheet(event)} disabled={isSyncing === event.id}>
                  {isSyncing === event.id ? "Syncing..." : "Sync Sheet"}
                </button>
                <button className="secondary" onClick={() => loadSyncHistory(event)}>
                  Sync History
                </button>
                <button className="secondary" onClick={() => handleViewEvent(event)}>
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {detailEvent ? (
        <section>
          <h2>Event Detail: {detailEvent.name}</h2>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <p className="status">Slug: {detailEvent.slug}</p>
            <button className="secondary" onClick={() => setDetailEvent(null)}>
              Close
            </button>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <div style={{ flex: 1 }}>
              <label>QR Expiry (unix seconds, optional)</label>
              <input value={qrExpiry} onChange={(e) => setQrExpiry(e.target.value)} placeholder="1760000000" />
            </div>
            <button className="secondary" onClick={handleGenerateTickets}>
              Generate QR
            </button>
          </div>
          {ticketStatus ? <p className="status">{ticketStatus}</p> : null}
          {ticketError ? <p className="status">{ticketError}</p> : null}

          <section>
            <h2>Tickets</h2>
            <div className="grid">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="card">
                  <h3>{ticket.name}</h3>
                  <p className="status">{ticket.ticketCode}</p>
                  <p className="status">{ticket.personalEmail}</p>
                  <p className="status">Type: {ticket.ticketType}</p>
                  <p className="status">Checked in: {ticket.checkedIn ? "Yes" : "No"}</p>
                  <div className="row">
                    <button className="secondary" onClick={() => setSelectedTicket(ticket)}>
                      QR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      ) : null}

      {selectedTicket ? <QrPreview ticket={selectedTicket} onClose={() => setSelectedTicket(null)} /> : null}

      {syncHistoryEvent ? (
        <section>
          <h2>Sync History: {syncHistoryEvent.name}</h2>
          {syncHistory.length === 0 ? <p className="status">No sync history yet.</p> : null}
          <div className="grid">
            {syncHistory.map((job) => (
              <div key={job.id} className="card">
                <h3>{job.source}</h3>
                <p className="status">Status: {job.status}</p>
                <p className="status">
                  Imported {job.imported}, skipped {job.skipped}
                </p>
                <p className="status">
                  Rows {job.rowCount}/{job.totalRows} {job.truncated ? "(truncated)" : ""}
                </p>
                <p className="status">Started: {formatDateTime(job.startedAt)}</p>
                {job.finishedAt ? <p className="status">Finished: {formatDateTime(job.finishedAt)}</p> : null}
                {job.errorCount > 0 ? <p className="status">Errors: {job.errorCount}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
};

export default App;
