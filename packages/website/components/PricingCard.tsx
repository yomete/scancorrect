import React from 'react';

interface PricingCardProps {
  tier: 'free' | 'pro';
  price: string;
  period: string;
  features: string[];
  cta: string;
  ctaAction: () => void;
  highlighted?: boolean;
  badge?: string;
}

export default function PricingCard({
  tier,
  price,
  period,
  features,
  cta,
  ctaAction,
  highlighted = false,
  badge,
}: PricingCardProps) {
  return (
    <div
      className={`relative p-8 border rounded-lg transition-all duration-300 ${
        highlighted
          ? 'border-black shadow-xl scale-105'
          : 'border-gray-200 hover:shadow-lg'
      } bg-white`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-black text-white px-4 py-1 rounded-full text-sm font-bold">
            {badge}
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2 capitalize">{tier}</h3>
        <div className="mb-4">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-gray-600 ml-2">{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="w-5 h-5 text-black mr-3 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={ctaAction}
        className={`w-full py-3 px-6 rounded-lg font-bold transition-all duration-300 ${
          highlighted
            ? 'bg-black text-white hover:bg-gray-800'
            : 'bg-white text-black border-2 border-black hover:bg-black hover:text-white'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}
