import React, { useState, useEffect } from 'react';
import { api } from '../api';
import '../styles/qr-generator.css';

interface Ticket {
  id: string;
  ticketCode: string;
  name: string;
  ticketType: string;
  qrData?: string;
}

interface GenerationResult {
  success: boolean;
  total?: number;
  generated?: number;
  failed?: number;
  errors?: string[];
  message?: string;
}

interface QRCodeGeneratorProps {
  eventId: string;
}

export function QRCodeGenerator({ eventId }: QRCodeGeneratorProps) {
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [generatingTicketId, setGeneratingTicketId] = useState<string | null>(null);
  const [previewQR, setPreviewQR] = useState<{ ticketCode: string; qrData: string } | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  useEffect(() {
    if (eventId) {
      loadTickets();
    }    // eslint-disable-next-line react-hooks/exhaustive-deps  }, [eventId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/events/${eventId}/tickets`);
      const data = await response.json();
      setTickets(data.tickets || []);
      if (data.tickets && data.tickets.length > 0) {
        setSelectedTicket(data.tickets[0].id);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSingle = async () => {
    if (!selectedTicket) {
      alert('Please select a ticket');
      return;
    }

    try {
      setLoading(true);
      setGeneratingTicketId(selectedTicket);
      setResult(null);

      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/tickets/events/${eventId}/qr/generate-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicket }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, message: data.error || 'Failed to generate QR' });
        return;
      }

      setResult({
        success: true,
        message: `QR generated for ${data.ticketCode}`,
      });

      // Show preview
      if (data.qrData) {
        setPreviewQR({
          ticketCode: data.ticketCode,
          qrData: data.qrData,
        });
      }

      // Refresh tickets to show updated status
      loadTickets();
    } catch (error) {
      console.error('Error generating QR:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate QR',
      });
    } finally {
      setLoading(false);
      setGeneratingTicketId(null);
    }
  };

  const handleGenerateBulk = async () => {
    if (!eventId) {
      alert('No event selected');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setBulkProgress({ current: 0, total: 0 });

      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/tickets/events/${eventId}/qr/generate-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({
          success: false,
          message: data.error || 'Bulk generation failed',
        });
        return;
      }

      setResult({
        success: true,
        total: data.total,
        generated: data.generated,
        failed: data.failed,
        errors: data.errors,
      });

      setBulkProgress({ current: data.generated, total: data.total });

      // Refresh tickets
      loadTickets();
    } catch (error) {
      console.error('Error generating bulk QRs:', error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Bulk generation failed',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async (qrData: string, ticketCode: string) => {
    try {
      // Create canvas from Base64 QR data
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // Simple QR visualization (in production, use qrcode library for actual QR generation)
      canvas.width = 300;
      canvas.height = 300;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = 'black';
      ctx.font = '12px monospace';
      ctx.fillText('QR Data:', 10, 20);
      ctx.fillText(qrData.slice(0, 40) + '...', 10, 40);
      ctx.fillText(`Ticket: ${ticketCode}`, 10, 60);

      // Download
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `QR_${ticketCode}.png`;
      link.click();
    } catch (error) {
      console.error('Error downloading QR:', error);
      alert('Failed to download QR');
    }
  };

  if (!eventId) {
    return (
      <div className="qr-generator-container">
        <div className="empty-state">
          <h3>No Event Selected</h3>
          <p>Please select an event from the dashboard to generate QR codes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-generator-container">
      <div className="qr-header">
        <h2>QR Code Generator</h2>
        <p className="event-label">Event ID: {eventId}</p>
      </div>

      <div className="qr-tabs">
        <button
          className={`tab-btn ${activeTab === 'individual' ? 'active' : ''}`}
          onClick={() => setActiveTab('individual')}
        >
          Individual QR
        </button>
        <button
          className={`tab-btn ${activeTab === 'bulk' ? 'active' : ''}`}
          onClick={() => setActiveTab('bulk')}
        >
          Bulk Generation
        </button>
      </div>

      {/* Individual QR Tab */}
      {activeTab === 'individual' && (
        <div className="qr-tab-content individual-tab">
          <div className="qr-section">
            <label className="form-label">Select Ticket</label>
            <select
              value={selectedTicket}
              onChange={(e) => setSelectedTicket(e.target.value)}
              disabled={loading}
              className="form-select"
            >
              <option value="">-- Choose a ticket --</option>
              {tickets.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.ticketCode} - {ticket.name} ({ticket.ticketType})
                  {ticket.qrData ? ' ✓' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerateSingle}
            disabled={loading || !selectedTicket}
            className="btn btn-primary"
          >
            {loading ? 'Generating...' : 'Generate QR'}
          </button>

          {result && (
            <div className={`result-box ${result.success ? 'success' : 'error'}`}>
              {result.success ? '✓' : '✗'} {result.message}
            </div>
          )}

          {previewQR && (
            <div className="qr-preview-section">
              <h3>QR Code Preview</h3>
              <div className="qr-preview-box">
                <div className="qr-code-display">
                  <p className="ticket-code">{previewQR.ticketCode}</p>
                  <div className="qr-data-preview">
                    <code>{previewQR.qrData.slice(0, 50)}...</code>
                  </div>
                </div>
              </div>
              <button
                onClick={() => downloadQR(previewQR.qrData, previewQR.ticketCode)}
                className="btn btn-secondary"
              >
                Download QR (PNG)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Generation Tab */}
      {activeTab === 'bulk' && (
        <div className="qr-tab-content bulk-tab">
          <div className="bulk-info">
            <p>Generate QR codes for all tickets in this event at once.</p>
            <p className="total-tickets">Total Tickets: {tickets.length}</p>
            <p className="no-qr-tickets">
              Tickets without QR: {tickets.filter((t) => !t.qrData).length}
            </p>
          </div>

          <button
            onClick={handleGenerateBulk}
            disabled={loading || tickets.length === 0}
            className="btn btn-primary btn-large"
          >
            {loading ? 'Generating in progress...' : 'Generate All QRs'}
          </button>

          {loading && bulkProgress.total > 0 && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(bulkProgress.current / bulkProgress.total) * 100}%`,
                  }}
                ></div>
              </div>
              <p className="progress-text">
                {bulkProgress.current} / {bulkProgress.total} QR codes generated
              </p>
            </div>
          )}

          {result && (
            <div className={`result-box ${result.success ? 'success' : 'error'}`}>
              <div className="result-header">
                {result.success ? '✓' : '✗'} Bulk Generation Complete
              </div>
              {result.total !== undefined && (
                <div className="result-stats">
                  <p>
                    <strong>Total:</strong> {result.total}
                  </p>
                  <p className="generated">
                    <strong>Generated:</strong> {result.generated}
                  </p>
                  {result.failed ? (
                    <p className="failed">
                      <strong>Failed:</strong> {result.failed}
                    </p>
                  ) : null}
                </div>
              )}
              {result.errors && result.errors.length > 0 && (
                <div className="errors-list">
                  <p className="error-title">Errors:</p>
                  <ul>
                    {result.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>... and {result.errors.length - 5} more</li>
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
}
