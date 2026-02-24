import { useMemo, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { TicketRecord } from "../types";

const buildFilename = (ticket: TicketRecord) => {
  try {
    const safe = ticket.ticketCode.replace(/[^a-zA-Z0-9-_]/g, "_");
    return `ticket-${safe}.png`;
  } catch (error) {
    console.warn("[QrPreview] buildFilename failed", error);
    return "ticket-qr.png";
  }
};

type QrPreviewProps = {
  ticket: TicketRecord;
  onClose: () => void;
};

export const QrPreview = ({ ticket, onClose }: QrPreviewProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const token = useMemo(() => ticket.qrData || "", [ticket.qrData]);

  const handleDownload = useCallback(() => {
    try {
      const canvas = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) {
        console.warn("[QrPreview] canvas missing");
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = buildFilename(ticket);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.warn("[QrPreview] download failed", error);
    }
  }, [ticket]);

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>QR Preview</h2>
        <button className="secondary" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="status">{ticket.name} • {ticket.ticketCode}</p>
      {token ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }} ref={canvasRef}>
          <QRCodeCanvas value={token} size={220} includeMargin />
          <button className="secondary" onClick={handleDownload}>
            Download PNG
          </button>
        </div>
      ) : (
        <p className="status">QR not generated yet.</p>
      )}
    </section>
  );
};
