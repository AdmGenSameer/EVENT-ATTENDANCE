import React, { useState, useEffect } from "react";

const TicketCard = ({ regNo, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (regNo) fetchTicketDetails();
  }, [regNo]);

  const fetchTicketDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/tickets/${regNo}`);
      const data = await response.json();

      if (data.success) {
        setTicket(data);
      } else {
        console.error("Ticket not found");
      }
    } catch (error) {
      console.error("Error fetching ticket data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!ticket) return (
    <div className="p-6 text-center">Ticket not found</div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>

        <h1 className="text-gray-700 text-2xl font-sans p-3">Your Ticket Details</h1>

        <div className="text-center mb-4">
          <p><strong>Name:</strong> {ticket.participant.name}</p>
          <p><strong>Email:</strong> {ticket.participant.email}</p>
          <p><strong>Reg No:</strong> {ticket.participant.registrationNumber}</p>
          <p>
            <strong>Status:</strong> {ticket.participant.checkedIn ? "Checked In ✅" : "Not Checked In ❌"}
          </p>
        </div>

        {ticket.duoParticipants && ticket.duoParticipants.length > 0 && (
          <div className="text-center mb-4">
            <h2 className="font-semibold">Duo Participants</h2>
            {ticket.duoParticipants.map((duo, index) => (
              <p key={index}>
                {duo.fullName} - {duo.status}
              </p>
            ))}
          </div>
        )}

        <div className="w-full flex items-center justify-center mt-4">
          {ticket.qrCode ? (
            <img src={ticket.qrCode} alt="QR Code" className="w-64 h-64" />
          ) : (
            <p className="text-gray-500">No QR code available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketCard;