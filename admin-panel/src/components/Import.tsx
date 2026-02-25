import { useState } from "react";
import { api } from "../api";
import "../styles/import.css";

const TICKET_TYPES = ["regular", "regular duo", "front row solo", "front row duo"];

interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
}

interface ParticipantFormData {
  name: string;
  email: string;
  registrationNo: string;
  contactNo: string;
  ticketType: string;
  duoName?: string;
  duoEmail?: string;
  duoRegistrationNo?: string;
  duoContactNo?: string;
}

export const Import = () => {
  const [activeSubTab, setActiveSubTab] = useState<"manual" | "csv" | "sheets">("manual");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [sheetsSyncLoading, setSheetsSyncLoading] = useState(false);

  const eventId = (import.meta as any).env.VITE_EVENT_ID || "default-event-id";

  // Manual participant entry
  const [formData, setFormData] = useState<ParticipantFormData>({
    name: "",
    email: "",
    registrationNo: "",
    contactNo: "",
    ticketType: "regular",
  });

  const isDuoTicket = formData.ticketType.includes("duo");

  const handleFormChange = (field: keyof ParticipantFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await api.post<any>("/tickets/add-participant", {
        eventId,
        name: formData.name,
        email: formData.email,
        ticketType: formData.ticketType,
        ...(isDuoTicket && formData.duoName && formData.duoEmail ? {
          duo: {
            name: formData.duoName,
            email: formData.duoEmail,
          },
        } : {}),
      });

      if ((response as any).success) {
        setMessage({
          type: "success",
          text: `✓ Participant added successfully (Ticket: ${(response as any).ticketCode})`,
        });
        setFormData({
          name: "",
          email: "",
          registrationNo: "",
          contactNo: "",
          ticketType: "regular",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `✗ Failed to add participant: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  // CSV File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);
    setImportResult(null);

    try {
      const formDataObj = new FormData();
      formDataObj.append("file", file);
      formDataObj.append("eventId", eventId);

      const response = await fetch(`${import.meta.env.VITE_API_BASE || "http://localhost:4000/api"}/tickets/import`, {
        method: "POST",
        body: formDataObj,
      });

      const result: ImportResult = await response.json();

      if (response.ok && result.success) {
        setMessage({
          type: "success",
          text: `✓ Import successful: ${result.imported} imported, ${result.skipped} skipped`,
        });
        setImportResult(result);
      } else {
        setMessage({
          type: "error",
          text: `✗ Import failed: ${result.errors?.[0] || "Unknown error"}`,
        });
        setImportResult(result);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `✗ Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
      // Reset file input
      e.target.value = "";
    }
  };

  // Google Sheets Sync
  const extractSheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleSyncFromSheets = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sheetsUrl.trim()) {
      setMessage({
        type: "error",
        text: "✗ Please enter a Google Sheets URL",
      });
      return;
    }

    const sheetId = extractSheetId(sheetsUrl);
    if (!sheetId) {
      setMessage({
        type: "error",
        text: "✗ Invalid Google Sheets URL. Please use the full sharing URL.",
      });
      return;
    }

    setSheetsSyncLoading(true);
    setMessage(null);
    setImportResult(null);

    try {
      const response = await api.post<any>("/tickets/sync-google-sheets", {
        eventId,
        sheetId,
      });

      if ((response as any).success) {
        setMessage({
          type: "success",
          text: `✓ Sync successful: ${(response as any).imported} imported, ${(response as any).skipped} skipped`,
        });
        setImportResult({
          success: true,
          imported: (response as any).imported,
          skipped: (response as any).skipped,
          errors: (response as any).errors || [],
        });
        setSheetsUrl("");
      } else {
        setMessage({
          type: "error",
          text: `✗ Sync failed: ${(response as any).error || "Unknown error"}`,
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `✗ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setSheetsSyncLoading(false);
    }
  };

  return (
    <div className="import-container">
      <h2>Participant Management</h2>

      {/* Sub-tabs */}
      <div className="import-subtabs">
        <button
          className={`subtab-btn ${activeSubTab === "manual" ? "active" : ""}`}
          onClick={() => setActiveSubTab("manual")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Manually
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "csv" ? "active" : ""}`}
          onClick={() => setActiveSubTab("csv")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Upload File
        </button>
        <button
          className={`subtab-btn ${activeSubTab === "sheets" ? "active" : ""}`}
          onClick={() => setActiveSubTab("sheets")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Google Sheets
        </button>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeSubTab === "manual" && (
        <div className="import-section">
          <form onSubmit={handleAddParticipant} className="participant-form">
            <div className="form-group">
              <label>Ticket Type *</label>
              <select
                value={formData.ticketType}
                onChange={(e) => handleFormChange("ticketType", e.target.value)}
                className="form-input"
              >
                {TICKET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <h3 className="form-section-title">Primary Participant</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className="form-input"
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange("email", e.target.value)}
                  className="form-input"
                  placeholder="college@email.com"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Registration No.</label>
                <input
                  type="text"
                  value={formData.registrationNo}
                  onChange={(e) => handleFormChange("registrationNo", e.target.value)}
                  className="form-input"
                  placeholder="REG123456"
                />
              </div>
              <div className="form-group">
                <label>Contact No.</label>
                <input
                  type="tel"
                  value={formData.contactNo}
                  onChange={(e) => handleFormChange("contactNo", e.target.value)}
                  className="form-input"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            {/* Duo Participant Section */}
            {isDuoTicket && (
              <>
                <h3 className="form-section-title">Second Participant</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={formData.duoName || ""}
                      onChange={(e) => handleFormChange("duoName", e.target.value)}
                      className="form-input"
                      placeholder="Full name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.duoEmail || ""}
                      onChange={(e) => handleFormChange("duoEmail", e.target.value)}
                      className="form-input"
                      placeholder="college@email.com"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Registration No.</label>
                    <input
                      type="text"
                      value={formData.duoRegistrationNo || ""}
                      onChange={(e) => handleFormChange("duoRegistrationNo", e.target.value)}
                      className="form-input"
                      placeholder="REG789012"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact No.</label>
                    <input
                      type="tel"
                      value={formData.duoContactNo || ""}
                      onChange={(e) => handleFormChange("duoContactNo", e.target.value)}
                      className="form-input"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Adding..." : "Add Participant"}
            </button>
          </form>
        </div>
      )}

      {/* CSV Upload Tab */}
      {activeSubTab === "csv" && (
        <div className="import-section">
          <div className="upload-container">
            <div className="upload-info">
              <h3>Upload Participants</h3>
              <p>Supported formats: CSV, Excel (.xlsx, .xls)</p>
              <p className="info-text">
                <strong>Required columns:</strong> NAME, Registration No., College Email Id, Contact No., TICKET TYPE
              </p>
              <p className="info-text">
                <strong>For duo tickets:</strong> Also include NAME:, REGISTRATION NO., COLLEGE EMAIL ID, CONTACT NO. columns for second participant
              </p>
            </div>

            <label className="file-upload-label">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                disabled={loading}
                className="file-input"
              />
              <div className="file-upload-box">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-9" />
                </svg>
                <p>Click to upload or drag and drop</p>
                <p className="small">CSV or Excel file</p>
              </div>
            </label>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="import-results">
              <h3>Import Results</h3>
              <div className="results-stats">
                <div className="stat">
                  <span className="stat-label">Imported</span>
                  <span className="stat-value success">{importResult.imported}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Skipped</span>
                  <span className="stat-value warning">{importResult.skipped}</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="errors-section">
                  <h4>Errors ({importResult.errors.length})</h4>
                  <ul className="error-list">
                    {importResult.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="more-errors">... and {importResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Google Sheets Sync Tab */}
      {activeSubTab === "sheets" && (
        <div className="import-section">
          <div className="sheets-container">
            <div className="sheets-info">
              <h3>Sync from Google Sheets</h3>
              <p>Connect to your Google Sheet to automatically sync participant data.</p>
              <p className="info-text">
                <strong>Required columns:</strong> NAME, Registration No., College Email Id, Contact No., TICKET TYPE
              </p>
              <p className="info-text">
                <strong>For duo tickets:</strong> Also include NAME:, REGISTRATION NO., COLLEGE EMAIL ID, CONTACT NO. columns
              </p>
              <p className="info-text">
                <strong>Setup:</strong> Share your Google Sheet with the service account and paste the URL below
              </p>
            </div>

            <form onSubmit={handleSyncFromSheets} className="sheets-form">
              <div className="form-group">
                <label htmlFor="sheets-url">Google Sheets URL *</label>
                <input
                  id="sheets-url"
                  type="url"
                  value={sheetsUrl}
                  onChange={(e) => setSheetsUrl(e.target.value)}
                  className="form-input"
                  placeholder="https://docs.google.com/spreadsheets/d/1ABC123.../edit"
                  disabled={sheetsSyncLoading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={sheetsSyncLoading || !sheetsUrl.trim()}
              >
                {sheetsSyncLoading ? "Syncing..." : "Sync Participants"}
              </button>
            </form>
          </div>

          {/* Import Results */}
          {importResult && (
            <div className="import-results">
              <h3>Sync Results</h3>
              <div className="results-stats">
                <div className="stat">
                  <span className="stat-label">Imported</span>
                  <span className="stat-value success">{importResult.imported}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Skipped</span>
                  <span className="stat-value warning">{importResult.skipped}</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="errors-section">
                  <h4>Errors ({importResult.errors.length})</h4>
                  <ul className="error-list">
                    {importResult.errors.slice(0, 10).map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="more-errors">... and {importResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
