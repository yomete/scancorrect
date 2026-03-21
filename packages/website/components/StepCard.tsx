import React from 'react';

interface StepCardProps {
  number: 1 | 2 | 3;
  title: string;
  description: string;
}

export default function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="flex flex-col items-center text-center p-6">
      <div className="w-16 h-16 rounded-full border-4 border-black flex items-center justify-center mb-4">
        <span className="text-3xl font-bold font-fjalla">{number}</span>
      </div>
      <h3 className="text-2xl font-bold mb-3 font-fjalla">{title}</h3>
      <p className="text-gray-600 leading-relaxed max-w-sm text-pretty">{description}</p>
    </div>
  );
}
