import React from 'react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="group p-6 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.06)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.08),0_4px_10px_rgba(0,0,0,0.04)] transition-shadow duration-300 bg-white">
      <div className="mb-4 flex justify-center">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-center text-balance">{title}</h3>
      <p className="text-gray-600 text-center leading-relaxed text-pretty">{description}</p>
    </div>
  );
}
