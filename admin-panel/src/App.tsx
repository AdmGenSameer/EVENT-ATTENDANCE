import { useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { Participants } from "./components/Participants";
import { SeatingArrangement } from "./components/SeatingArrangement";
import { Import } from "./components/Import";
import { QRCodeGenerator } from "./components/QRCodeGenerator";

type Tab = "dashboard" | "participants" | "seating" | "import" | "qr-generator";

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Single-event admin panel
  const eventId = import.meta.env.VITE_EVENT_ID || "default-event-id";

  return (
    <main>
      <header>
        <div className="header-content">
          <h1>Event Management System</h1>
          <p className="subtitle">Tomorrow's Event Control Panel</p>
        </div>
      </header>

      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === "participants" ? "active" : ""}`}
          onClick={() => setActiveTab("participants")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Participants
        </button>
        <button
          className={`tab-btn ${activeTab === "seating" ? "active" : ""}`}
          onClick={() => setActiveTab("seating")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z" />
          </svg>
          Seating
        </button>
        <button
          className={`tab-btn ${activeTab === "import" ? "active" : ""}`}
          onClick={() => setActiveTab("import")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Import
        </button>
        <button
          className={`tab-btn ${activeTab === "qr-generator" ? "active" : ""}`}
          onClick={() => setActiveTab("qr-generator")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4M5 5h6v6H5V5m8-2h6v6h-6V3z" />
          </svg>
          QR Generator
        </button>
      </nav>

      <div className="tab-content">
        {activeTab === "dashboard" && <Dashboard eventId={eventId} />}
        {activeTab === "participants" && <Participants eventId={eventId} />}
        {activeTab === "seating" && <SeatingArrangement eventId={eventId} />}
        {activeTab === "import" && <Import />}
        {activeTab === "qr-generator" && <QRCodeGenerator eventId={eventId} />}
      </div>
    </main>
  );
};

export default App;
