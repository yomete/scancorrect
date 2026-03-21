'use client';

import { useState, useEffect } from 'react';
import { ScrollLink } from './ScrollLink';

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${
        isScrolled ? 'bg-white shadow-md' : 'bg-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">📷</span>
            <span className="text-2xl font-fjalla font-bold">ScanCorrect</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <ScrollLink
              href="#features"
              className="text-gray-700 hover:text-black transition-colors"
            >
              Features
            </ScrollLink>
            <ScrollLink
              href="#pricing"
              className="text-gray-700 hover:text-black transition-colors"
            >
              Pricing
            </ScrollLink>
            <ScrollLink
              href="#download"
              className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-[background-color,transform] active:scale-[0.96]"
            >
              Download
            </ScrollLink>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden p-2 text-gray-700 hover:text-black"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-gray-200 mt-2">
            <div className="flex flex-col gap-4 pt-4">
              <ScrollLink
                href="#features"
                className="text-gray-700 hover:text-black transition-colors py-2"
                onClick={closeMobileMenu}
              >
                Features
              </ScrollLink>
              <ScrollLink
                href="#pricing"
                className="text-gray-700 hover:text-black transition-colors py-2"
                onClick={closeMobileMenu}
              >
                Pricing
              </ScrollLink>
              <ScrollLink
                href="#download"
                className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition-colors text-center"
                onClick={closeMobileMenu}
              >
                Download
              </ScrollLink>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
