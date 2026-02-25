import React from "react";

const Form = () => {
  return (
    <div className="min-h-[50vh] bg-gray-50 flex flex-col justify-center px-4">
      
      <div className="w-full max-w-md mx-auto bg-white p-6 rounded-2xl shadow-lg">
        
        <h1 className="text-xl font-semibold text-gray-800 text-center mb-6">
          Find Your Ticket
        </h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Registration Number
            </label>

            <input
              type="text"
              placeholder="Enter your registration number"
              className="
                w-full
                h-14
                px-4
                rounded-xl
                border
                border-gray-300
                text-base
                placeholder-gray-400
                focus:outline-none
                focus:ring-2
                focus:ring-blue-500
                focus:border-blue-500
                transition
                duration-200
                bg-white
                shadow-sm
              "
            />
          </div>

          <button
            className="
              w-full
              h-14
              rounded-xl
              bg-blue-600
              text-white
              text-base
              font-semibold
              shadow-md
              active:scale-95
              transition
              duration-150
            "
          >
            Submit
          </button>
        </div>

      </div>
    </div>
  );
};

export default Form;