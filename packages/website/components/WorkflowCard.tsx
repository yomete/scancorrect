import React from 'react';

interface WorkflowCardProps {
  app: 'lightroom' | 'captureone';
  title: string;
  description: string;
  smallText: string;
}

export default function WorkflowCard({ app, title, description, smallText }: WorkflowCardProps) {
  return (
    <div className="p-8 border border-gray-200 rounded-lg bg-white hover:shadow-lg transition-all duration-300">
      <div className="flex items-center mb-4">
        {app === 'lightroom' ? (
          <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <path d="M7 7h3v10H7V7z" fill="currentColor"/>
            <path d="M12 14h4v3h-4v-3z" fill="currentColor"/>
          </svg>
        ) : (
          <svg className="w-8 h-8 mr-3" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )}
        <h3 className="text-xl font-bold">{title}</h3>
      </div>
      <p className="text-gray-700 mb-3 leading-relaxed">{description}</p>
      <p className="text-sm text-gray-500">{smallText}</p>
    </div>
  );
}
