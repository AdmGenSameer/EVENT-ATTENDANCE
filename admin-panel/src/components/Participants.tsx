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
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);

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
      ticket.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.registrationNo || "").toLowerCase().includes(searchTerm.toLowerCase());

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
                  <tr 
                    key={ticket.id} 
                    className={ticket.checkedIn ? "checked-in" : ""}
                    onClick={() => setSelectedTicket(ticket)}
                    style={{ cursor: "pointer" }}
                  >
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

      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Participant Details</h2>
              <button className="modal-close" onClick={() => setSelectedTicket(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>Name</span>
                  </div>
                  <div className="detail-value">{selectedTicket.name}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email</span>
                  </div>
                  <div className="detail-value">{selectedTicket.personalEmail}</div>
                </div>

                {selectedTicket.registrationNo && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      <span>Registration No.</span>
                    </div>
                    <div className="detail-value">{selectedTicket.registrationNo}</div>
                  </div>
                )}

                {selectedTicket.contactNo && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>Contact No.</span>
                    </div>
                    <div className="detail-value">{selectedTicket.contactNo}</div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <span>Ticket Code</span>
                  </div>
                  <div className="detail-value"><code>{selectedTicket.ticketCode}</code></div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span>Ticket Type</span>
                  </div>
                  <div className="detail-value">
                    <span className="ticket-type-badge">{selectedTicket.ticketType}</span>
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Seat Number</span>
                  </div>
                  <div className="detail-value">
                    {selectedTicket.seatNumber ? (
                      <strong>{selectedTicket.seatNumber}</strong>
                    ) : (
                      <span className="text-muted">Not assigned</span>
                    )}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Check-in Status</span>
                  </div>
                  <div className="detail-value">
                    {selectedTicket.checkedIn ? (
                      <span className="status-badge success">✓ Checked In</span>
                    ) : (
                      <span className="status-badge pending">⏱ Pending</span>
                    )}
                  </div>
                </div>

                {selectedTicket.checkedInAt && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Checked In At</span>
                    </div>
                    <div className="detail-value">
                      {new Date(selectedTicket.checkedInAt).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Created At</span>
                  </div>
                  <div className="detail-value">
                    {new Date(selectedTicket.createdAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedTicket(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
