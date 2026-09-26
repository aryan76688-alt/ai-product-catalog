import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const norm = (status || '').toUpperCase();

  switch (norm) {
    case 'FINALIZED':
    case 'READY':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Ready
        </span>
      );
    case 'CLEANED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          Cleaned
        </span>
      );
    case 'MATCHED':
    case 'PTR_MATCHED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
          PTR Matched
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          Needs Review
        </span>
      );
    case 'ANALYZING':
    case 'PROCESSING':
    case 'IMAGE_PROCESSING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping"></span>
          Processing
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
          Failed
        </span>
      );
    case 'UPLOADED':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
          Uploaded
        </span>
      );
  }
}
