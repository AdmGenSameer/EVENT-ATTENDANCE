import { useState, useEffect } from "react";
import { getLiveStatus, setLiveStatus } from "../api";
import { LiveRegistrationStatus } from "../types";

interface DashboardProps {
  eventId: string;
}

export const Dashboard = ({ eventId }: DashboardProps) => {
  const [liveStatus, setLiveStatusState] = useState<LiveRegistrationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLiveStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await getLiveStatus(eventId);
      setLiveStatusState(status);
    } catch (err) {
      console.error("Failed to load live status:", err);
      setError("Failed to load live status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveStatus();
    // Poll every 5 seconds
    const interval = setInterval(loadLiveStatus, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const handleToggleLive = async () => {
    if (!liveStatus) return;

    try {
      setLoading(true);
      setError(null);
      const newStatus = await setLiveStatus(eventId, !liveStatus.isLive);
      setLiveStatusState(newStatus);
    } catch (err) {
      console.error("Failed to toggle live status:", err);
      setError("Failed to update live status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Live Registration Control</h2>
          {liveStatus && (
            <div className={`live-indicator ${liveStatus.isLive ? "active" : ""}`}>
              <span className="live-dot"></span>
              {liveStatus.isLive ? "LIVE" : "OFFLINE"}
            </div>
          )}
        </div>

        <div className="dashboard-content">
          <p className="dashboard-description">
            Control whether mobile app scanners can register new participants.
            When live, the mobile app will show a live indicator.
          </p>

          <button
            onClick={handleToggleLive}
            disabled={loading || !liveStatus}
            className={`live-toggle-btn ${liveStatus?.isLive ? "active" : ""}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {liveStatus?.isLive ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
            {loading ? "Loading..." : liveStatus?.isLive ? "Stop Live Registrations" : "Start Live Registrations"}
          </button>

          {error && <div className="error-message">{error}</div>}

          {liveStatus && (
            <div className="status-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Last updated: {new Date(liveStatus.updatedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Registration Status</div>
            <div className="stat-value">{liveStatus?.isLive ? "Active" : "Inactive"}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Mobile App Status</div>
            <div className="stat-value">{liveStatus?.isLive ? "Synced" : "Offline"}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
