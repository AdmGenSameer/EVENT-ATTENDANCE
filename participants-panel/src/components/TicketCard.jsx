import React, { useState } from 'react'

const TicketCard = ({onclose}) => {
    const [qrcode, SetQrCode] = useState(null);

    const ticketDetailsFetch = async (regNo) => {
        try {
            const response = await fetch(`http://localhost:5000/api/tickets/${regNo}`);
            if (response.ok) {
                const data = await response.json();
                console.log("Fetched participant data:", data);
                if (data.success && data.participant) {
                    const participant = data.participant;
                }
            } else {
                console.error("Failed to fetch participant data. Status:", response.status);
            }
        } catch (error) {
            console.error("Error fetching participant data:", error);
        }
    }


    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full rounded-xl shadow-xl p-6 relative">
        <button
          onClick={onclose}
          className="absolute top-3 right-3 text-gray-500 hover:text-black text-xl"
        >
          ✕
        </button>
            <h1 className='text-gray-700 text-2xl font-sans p-3'>Your Ticket Details Below</h1>
            <div className='w-full h-[70%] flex items-center justify-center'>
                {qrcode ? (
                    <img src={qrcode} alt="QR Code" className='w-64 h-64' />
                ) : (
                    <p className='text-gray-500'>No QR code available. Please enter your registration number.</p>
                )}
            </div>

            
        </div>
        </div>
        

    )
}

export default TicketCard
