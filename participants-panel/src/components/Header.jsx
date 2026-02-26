import React from 'react';

const Header = () => {
  return (
    <div className="relative text-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-6 shadow-lg">
      <h1 className="text-3xl font-bold tracking-wide">Xenith '26</h1>
      <p className="mt-2 text-sm opacity-80">Check your registration & access your ticket instantly</p>
      {/* Decorative SVG */}
      <svg
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 opacity-20"
        viewBox="0 0 1440 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          fill="#ffffff"
          fillOpacity="0.1"
          d="M0,128L1440,32L1440,320L0,320Z"
        />
      </svg>
    </div>
  );
};

export default Header;
