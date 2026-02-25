import React, { useState, useEffect } from "react";

const TicketCard = ({ regNo, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (regNo) fetchTicketDetails();
  }, [regNo]);

  const fetchTicketDetails = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/api/events/tickets/${regNo}`
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

  const { participant, qrData } = ticket;

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

        <div className="text-center mb-4">
          <p><strong>Name:</strong> {participant.name}</p>
          <p><strong>Email:</strong> {participant.personalEmail}</p>
          <p><strong>Reg No:</strong> {participant.registrationNo}</p>
          <p><strong>Contact No:</strong> {participant.contactNo}</p>
          <p><strong>Ticket Type:</strong> {participant.ticketType}</p>
          <p><strong>Seat Number:</strong> {participant.seatNumber}</p>
          <p className="flex justify-center items-center gap-2">
            <strong>Status:</strong>
            {participant.checkedIn ? (
              <span className="text-green-600 flex items-center gap-1">
                Checked In
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="text-red-500">Not Checked In ❌</span>
            )}
          </p>
        </div>

        {participant.duo && (
          <div className="text-center mb-4 border-t pt-4">
            <h2 className="font-semibold text-lg mb-2">Duo Participant</h2>
            <p><strong>Name:</strong> {participant.duo.name}</p>
            <p><strong>Email:</strong> {participant.duo.email}</p>
            <p><strong>Reg No:</strong> {participant.duo.registrationNo}</p>
            <p><strong>Contact No:</strong> {participant.duo.contactNo}</p>
            <p><strong>Ticket Type:</strong> {participant.duo.ticketType}</p>
            <p className="flex justify-center items-center gap-2">
              <strong>Status:</strong>
              {participant.duo.checkedIn ? (
                <span className="text-green-600 flex items-center gap-1">
                  Checked In
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              ) : (
                <span className="text-red-500">Not Checked In ❌</span>
              )}
            </p>
          </div>
        )}

        <div className="w-full flex items-center justify-center mt-4">
          {qrData ? (
            <img
              src={qrData.startsWith("data:image") ? qrData : `data:image/png;base64,${qrData}`}
              alt="QR Code"
              className="w-64 h-64 border p-2 rounded-xl shadow-lg"
            />
          ) : (
            <p className="text-gray-500">No QR code available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCard;
