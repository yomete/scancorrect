'use client';

import { ScrollLink } from './ScrollLink';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F9F5F0]/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <span className="text-lg font-serif font-semibold tracking-tight">ScanCorrect</span>
          <ScrollLink
            href="#download"
            className="bg-[#1a1a1a] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
          >
            Download
          </ScrollLink>
        </div>
      </div>
    </header>
  );
}
