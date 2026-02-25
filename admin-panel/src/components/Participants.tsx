import { useState, useEffect } from "react";
import { getTickets } from "../api";
import { TicketRecord } from "../types";

interface ParticipantsProps {
  eventId: string;
}

export const Participants = ({ eventId }: ParticipantsProps) => {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "checked-in" | "pending">("all");

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTickets(eventId);
      setTickets(data);
    } catch (err) {
      console.error("Failed to load tickets:", err);
      setError("Failed to load participants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    // Refresh every 10 seconds
    const interval = setInterval(loadTickets, 10000);
    return () => clearInterval(interval);
  }, [eventId]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.personalEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "checked-in" && ticket.checkedIn) ||
      (filterStatus === "pending" && !ticket.checkedIn);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: tickets.length,
    checkedIn: tickets.filter((t) => t.checkedIn).length,
    pending: tickets.filter((t) => !t.checkedIn).length,
  };

  return (
    <div className="participants-container">
      <div className="participants-header">
        <div className="stats-row">
          <div className="stat-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Total: {stats.total}</span>
          </div>
          <div className="stat-badge success">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Checked In: {stats.checkedIn}</span>
          </div>
          <div className="stat-badge warning">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pending: {stats.pending}</span>
          </div>
        </div>

        <div className="search-filter-row">
          <div className="search-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or ticket code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button
              className={filterStatus === "all" ? "active" : ""}
              onClick={() => setFilterStatus("all")}
            >
              All
            </button>
            <button
              className={filterStatus === "checked-in" ? "active" : ""}
              onClick={() => setFilterStatus("checked-in")}
            >
              Checked In
            </button>
            <button
              className={filterStatus === "pending" ? "active" : ""}
              onClick={() => setFilterStatus("pending")}
            >
              Pending
            </button>
          </div>

          <button onClick={loadTickets} disabled={loading} className="refresh-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && tickets.length === 0 ? (
        <div className="loading-state">Loading participants...</div>
      ) : (
        <div className="participants-table-container">
          <table className="participants-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Name</th>
                <th>Email</th>
                <th>Ticket Code</th>
                <th>Type</th>
                <th>Seat</th>
                <th>Checked In</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p>No participants found</p>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className={ticket.checkedIn ? "checked-in" : ""}>
                    <td>
                      <div className={`status-indicator ${ticket.checkedIn ? "success" : "pending"}`}>
                        {ticket.checkedIn ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="participant-name">{ticket.name}</td>
                    <td className="participant-email">{ticket.personalEmail}</td>
                    <td className="ticket-code">{ticket.ticketCode}</td>
                    <td>
                      <span className="ticket-type-badge">{ticket.ticketType}</span>
                    </td>
                    <td className="seat-number">
                      {ticket.seatNumber || <span className="text-muted">Not assigned</span>}
                    </td>
                    <td className="checked-in-time">
                      {ticket.checkedInAt ? new Date(ticket.checkedInAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
