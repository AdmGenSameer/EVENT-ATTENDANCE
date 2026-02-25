import { useState, useEffect } from "react";
import { getSeats, blockSeat, unblockSeat } from "../api";
import { Seat } from "../types";

interface SeatingArrangementProps {
  eventId: string;
}

const SEAT_CONFIG = {
  front: { prefix: "F", rows: ["A", "B", "C", "D", "E"], seatsPerRow: 15 },
  rear: { prefix: "R", rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"], seatsPerRow: 15 },
  balcony: { prefix: "B", rows: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"], seatsPerRow: 15 },
};

export const SeatingArrangement = ({ eventId }: SeatingArrangementProps) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const loadSeats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSeats(eventId);
      setSeats(data);
    } catch (err) {
      console.error("Failed to load seats:", err);
      setError("Failed to load seating arrangement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeats();
    // Refresh every 5 seconds to sync with mobile app
    const interval = setInterval(loadSeats, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const handleSeatClick = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleBlockToggle = async (seat: Seat) => {
    try {
      if (seat.status === "blocked") {
        const updated = await unblockSeat(eventId, seat.id);
        setSeats((prev) => prev.map((s) => (s.id === seat.id ? updated : s)));
      } else if (seat.status === "available") {
        const updated = await blockSeat(eventId, seat.id);
        setSeats((prev) => prev.map((s) => (s.id === seat.id ? updated : s)));
      }
      setSelectedSeat(null);
    } catch (err) {
      console.error("Failed to toggle seat block:", err);
      alert("Failed to update seat status");
    }
  };

  const getSeatsBySection = (section: "front" | "rear" | "balcony") => {
    return seats.filter((s) => s.section === section);
  };

  const getSeat = (section: "front" | "rear" | "balcony", row: string, number: number) => {
    const config = SEAT_CONFIG[section];
    const seatCode = `${config.prefix}${row}${number}`;
    return seats.find((s) => s.seatCode === seatCode);
  };

  const renderSeatGrid = (section: "front" | "rear" | "balcony", title: string) => {
    const config = SEAT_CONFIG[section];
    const sectionSeats = getSeatsBySection(section);
    const stats = {
      total: config.rows.length * config.seatsPerRow,
      assigned: sectionSeats.filter((s) => s.status === "assigned").length,
      blocked: sectionSeats.filter((s) => s.status === "blocked").length,
      available: sectionSeats.filter((s) => s.status === "available").length,
    };

    return (
      <div className="seating-section">
        <div className="section-header">
          <h3>{title}</h3>
          <div className="section-stats">
            <span className="stat assigned">{stats.assigned} Assigned</span>
            <span className="stat blocked">{stats.blocked} Blocked</span>
            <span className="stat available">{stats.available} Available</span>
          </div>
        </div>

        <div className="seat-grid">
          {config.rows.map((row) => (
            <div key={row} className="seat-row">
              <div className="row-label">{config.prefix}{row}</div>
              <div className="seats">
                {Array.from({ length: config.seatsPerRow }, (_, i) => i + 1).map((number) => {
                  const seat = getSeat(section, row, number);
                  const seatCode = `${config.prefix}${row}${number}`;

                  return (
                    <button
                      key={number}
                      className={`seat ${seat?.status || "loading"} ${selectedSeat?.id === seat?.id ? "selected" : ""}`}
                      onClick={() => seat && handleSeatClick(seat)}
                      title={seat ? `${seatCode}\n${seat.participantName || seat.status}` : seatCode}
                      disabled={!seat}
                    >
                      {number}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="seating-container">
      <div className="seating-header">
        <div className="seating-legend">
          <div className="legend-item">
            <div className="legend-box available"></div>
            <span>Available</span>
          </div>
          <div className="legend-item">
            <div className="legend-box assigned"></div>
            <span>Assigned</span>
          </div>
          <div className="legend-item">
            <div className="legend-box blocked"></div>
            <span>Blocked/Reserved</span>
          </div>
        </div>

        <button onClick={loadSeats} disabled={loading} className="refresh-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && seats.length === 0 ? (
        <div className="loading-state">Loading seating arrangement...</div>
      ) : (
        <>
          {renderSeatGrid("front", "Front Section (FA-FE)")}
          {renderSeatGrid("rear", "Rear Section (RA-RY)")}
          {renderSeatGrid("balcony", "Balcony Section (BA-BJ)")}
        </>
      )}

      {selectedSeat && (
        <div className="seat-modal-overlay" onClick={() => setSelectedSeat(null)}>
          <div className="seat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Seat {selectedSeat.seatCode}</h3>
              <button className="close-btn" onClick={() => setSelectedSeat(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="modal-content">
              <div className="modal-info">
                <div className="info-row">
                  <span className="label">Status:</span>
                  <span className={`value status-${selectedSeat.status}`}>
                    {selectedSeat.status.toUpperCase()}
                  </span>
                </div>

                {selectedSeat.participantName && (
                  <div className="info-row">
                    <span className="label">Participant:</span>
                    <span className="value">{selectedSeat.participantName}</span>
                  </div>
                )}

                <div className="info-row">
                  <span className="label">Section:</span>
                  <span className="value">{selectedSeat.section.toUpperCase()}</span>
                </div>
              </div>

              {selectedSeat.status !== "assigned" && (
                <div className="modal-actions">
                  <button
                    className={`action-btn ${selectedSeat.status === "blocked" ? "unblock" : "block"}`}
                    onClick={() => handleBlockToggle(selectedSeat)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      {selectedSeat.status === "blocked" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      )}
                    </svg>
                    {selectedSeat.status === "blocked" ? "Unblock Seat" : "Block Seat"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
