import React from 'react';

export default function VideoPlaceholder() {
  return (
    <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center group hover:bg-gray-800 transition-colors duration-300 cursor-pointer">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
          <svg
            className="w-10 h-10 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <p className="text-white text-lg font-semibold">Demo coming soon</p>
      </div>
    </div>
  );
}
