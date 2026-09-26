'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';

export default function ProcessingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isStartingBatch, setIsStartingBatch] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error('Failed to load jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartAll = async () => {
    setIsStartingBatch(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const resJson = await res.json();
      if (resJson.success) {
        alert(`Started batch processing for ${resJson.enqueuedCount} products!`);
        fetchJobs();
      }
    } catch (e: any) {
      alert(`Error starting batch: ${e.message}`);
    } finally {
      setIsStartingBatch(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            AI Background Processing Engine
          </h2>
          <p className="text-sm text-slate-500">
            Asynchronous OCR extraction, PTR auto-matching, and deterministic image compositing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchJobs}
            className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleStartAll}
            disabled={isStartingBatch}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Play className="w-3.5 h-3.5" />
            {isStartingBatch ? 'Starting...' : 'Process All Unprocessed'}
          </button>
        </div>
      </div>

      {/* Live Batch Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${data?.isBusy ? 'bg-purple-600 animate-ping' : 'bg-emerald-500'}`} />
            <h3 className="font-bold text-slate-900 text-sm">
              Worker Status: {data?.isBusy ? 'Processing Jobs' : 'Idle / Ready'}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-700">
            {data?.completedCount || 0} / {(data?.pendingCount || 0) + (data?.processingCount || 0) + (data?.completedCount || 0)} Completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${data?.percentage || 0}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
            <span className="block text-slate-500 text-[11px]">Processing</span>
            <span className="text-base font-bold text-purple-700">{data?.processingCount || 0}</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
            <span className="block text-slate-500 text-[11px]">Pending Queue</span>
            <span className="text-base font-bold text-amber-700">{data?.pendingCount || 0}</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <span className="block text-slate-500 text-[11px]">Completed</span>
            <span className="text-base font-bold text-emerald-700">{data?.completedCount || 0}</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
            <span className="block text-slate-500 text-[11px]">Failed</span>
            <span className="text-base font-bold text-rose-700">{data?.failedCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Recent Processing History</h3>

        {!data?.recentJobs || data.recentJobs.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            No processing jobs have run yet.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3">Job ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Progress</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentJobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono text-slate-500">
                      {job.id.slice(0, 8)}...
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {job.product?.productName || 'Unnamed'}
                    </td>
                    <td className="p-3 text-slate-600">
                      {job.jobType}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">{job.progress}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="p-3 text-slate-500 max-w-xs truncate">
                      {job.metadata || job.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
