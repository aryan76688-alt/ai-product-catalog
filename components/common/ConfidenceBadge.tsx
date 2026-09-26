import React from 'react';

interface ConfidenceBadgeProps {
  score?: number | null;
  label?: string;
}

export function ConfidenceBadge({ score, label }: ConfidenceBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        {label ? `${label}: ` : ''}--
      </span>
    );
  }

  const pct = Math.round(score * 100);

  if (score >= 0.90) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200" title="High confidence: Auto-verified">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        {label ? `${label}: ` : ''}{pct}%
      </span>
    );
  } else if (score >= 0.70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title="Medium confidence: Review recommended">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        {label ? `${label}: ` : ''}{pct}%
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200" title="Low confidence: Requires manual review">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
        {label ? `${label}: ` : ''}{pct}%
      </span>
    );
  }
}
