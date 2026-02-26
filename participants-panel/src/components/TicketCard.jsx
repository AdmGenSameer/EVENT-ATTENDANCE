import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

const TicketCard = ({ regNo, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (regNo) fetchTicketDetails();
  }, [regNo]);

  const fetchTicketDetails = async () => {
    try {
      const response = await fetch(
        `https://event-attendance-production.up.railway.app/api/tickets/events/tickets/${regNo}`
      );

      if (!response.ok) {
        console.error("Participant not found:", response.status);
        setTicket(null);
        return;
      }

      const data = await response.json();
      console.log("Fetched participant:", data);

      if (data.success) setTicket(data);
      else setTicket(null);
    } catch (error) {
      console.error("Error fetching participant:", error);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;
  if (!ticket) return <div className="p-6 text-center">Ticket not found</div>;

  const { participant, qrCode } = ticket;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative border border-gray-100">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>

        <h1 className="text-gray-700 text-2xl font-semibold text-center mb-4">
          Your Ticket
        </h1>

        {/* Participant Info */}
        <div className="text-center mb-4">
          <p><strong>Name:</strong> {participant.name}</p>
          <p><strong>Email:</strong> {participant.personalEmail}</p>
          <p><strong>Reg No:</strong> {participant.registrationNo}</p>
          <p><strong>Contact No:</strong> {participant.contactNo}</p>
          <p><strong>Ticket Type:</strong> {participant.ticketType}</p>
          <p><strong>Seat Number:</strong> {participant.seatNumber || "N/A"}</p>
          <p className="flex justify-center items-center gap-2">
            <strong>Status:</strong>
            {participant.checkedIn ? (
              <span className="text-green-600 flex items-center gap-1">
                Checked In
              </span>
            ) : (
              <span className="text-red-500">Not Checked In ❌</span>
            )}
          </p>
        </div>

        {/* Duo Participant (only if different) */}
        {participant.duo && participant.duo.name && participant.duo.name !== participant.name && (
          <div className="text-center mb-4 border-t pt-4">
            <h2 className="font-semibold text-lg mb-2">Duo Participant</h2>
            <p><strong>Name:</strong> {participant.duo.name}</p>
            <p><strong>Email:</strong> {participant.duo.email || "N/A"}</p>
            <p><strong>Reg No:</strong> {participant.duo.registrationNo || "N/A"}</p>
            <p><strong>Contact No:</strong> {participant.duo.contactNo || "N/A"}</p>
            <p><strong>Ticket Type:</strong> {participant.duo.ticketType || "N/A"}</p>
            <p className="flex justify-center items-center gap-2">
              <strong>Status:</strong>
              {participant.duo.checkedIn ? (
                <span className="text-green-600">Checked In</span>
              ) : (
                <span className="text-red-500">Not Checked In ❌</span>
              )}
            </p>
          </div>
        )}

        {/* QR Code */}
        <div className="w-full flex items-center justify-center mt-4">
          {qrCode ? (
            <QRCodeSVG value={qrCode} size={256} level="H" includeMargin={true} />
          ) : (
            <p className="text-gray-500">No QR code available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
