import React from "react";

const Form = ({ regNo, setRegNo, setShowTicketCard, msg }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!regNo.trim()) {
      msg("Please enter a valid registration number.");
      return;
    }
    setShowTicketCard(true);
  };

  return (
    <div className="min-h-[60vh] bg-gray-50 py-12 flex flex-col justify-center px-4">
      <div className="w-full max-w-md mx-auto bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="flex justify-center mb-6">
          {/* Decorative SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4zm6 0c0 2.21-1.79 4-4 4s-4-1.79-4-4 1.79-4 4-4 4 1.79 4 4z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-800 text-center mb-6">
          Find Your Ticket
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number
            </label>

            <input
              onChange={(e) => setRegNo(e.target.value)}
              type="text"
              placeholder="Enter your registration number"
              className="w-full h-14 px-4 rounded-xl border border-gray-300 text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 bg-white shadow-sm"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full h-14 rounded-xl bg-blue-600 text-white text-base font-semibold shadow-md hover:bg-blue-700 active:scale-95 transition duration-150"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default Form;
