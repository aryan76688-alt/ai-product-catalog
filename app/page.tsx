'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  AlertCircle,
  Upload,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Image as ImageIcon,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';

interface Stats {
  totalProducts: number;
  processed: number;
  needsReview: number;
  missingPtr: number;
  missingMrp: number;
  missingExpiry: number;
  failedImages: number;
  excelMatches: number;
  completionRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentProducts(data.recentProducts || []);
        setRecentAuditLogs(data.recentAuditLogs || []);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Catalog Overview
          </h2>
          <p className="text-sm text-slate-500">
            Monitor product extraction, PTR matches, image cleaning, and export readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLoading(true);
              fetchStats();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload New Images
          </Link>
        </div>
      </div>

      {/* Catalog Readiness Progress Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-400/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Automated Catalog Readiness
            </div>
            <h3 className="text-xl font-bold tracking-tight">
              {stats?.completionRate || 0}% Catalog Complete
            </h3>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              {stats?.processed || 0} of {stats?.totalProducts || 0} products have verified Product Name, MRP, PTR, Expiry, and clean 1:1 image.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/review"
              className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-100 transition shadow"
            >
              Review Queue ({stats?.needsReview || 0})
            </Link>
            <Link
              href="/export"
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-semibold hover:bg-emerald-600 transition shadow"
            >
              Export Catalog
            </Link>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="mt-5 w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-400 to-teal-300 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${stats?.completionRate || 0}%` }}
          />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Products</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats?.totalProducts ?? '--'}</div>
          <div className="text-[11px] text-slate-500 mt-1">Uploaded to studio</div>
        </div>

        {/* Processed / Ready */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Ready for Catalog</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats?.processed ?? '--'}</div>
          <div className="text-[11px] text-emerald-600/80 mt-1">100% data complete</div>
        </div>

        {/* Needs Review */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Needs Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats?.needsReview ?? '--'}</div>
          <div className="text-[11px] text-amber-600/80 mt-1">Missing or unverified</div>
        </div>

        {/* Excel Matches */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Excel Matches</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">{stats?.excelMatches ?? '--'}</div>
          <div className="text-[11px] text-indigo-600/80 mt-1">PTR linked from Excel</div>
        </div>

        {/* Missing PTR */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Missing PTR</span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats?.missingPtr ?? '--'}</div>
          <div className="text-[11px] text-slate-500 mt-1">Import Excel or use chat</div>
        </div>

        {/* Missing MRP */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Missing MRP</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats?.missingMrp ?? '--'}</div>
          <div className="text-[11px] text-slate-500 mt-1">OCR unread or absent</div>
        </div>

        {/* Missing Expiry */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Missing Expiry</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats?.missingExpiry ?? '--'}</div>
          <div className="text-[11px] text-slate-500 mt-1">Verify packaging date</div>
        </div>

        {/* Failed Images */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Failed Images</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{stats?.failedImages ?? '--'}</div>
          <div className="text-[11px] text-rose-600/80 mt-1">Reprocess required</div>
        </div>
      </div>

      {/* Two Column Layout: Recent Products & Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Products (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recently Added Products</h3>
            <Link
              href="/products"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No products uploaded yet. Click &quot;Upload New Images&quot; to begin.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentProducts.map((p) => {
                const img = p.cleanImageUrl || p.finalImageUrl || p.originalImageUrl;
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={p.productName} className="w-full h-full object-contain" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {p.productName}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>MRP: {p.mrp ? `₹${p.mrp.toFixed(2)}` : '❓'}</span>
                          <span>•</span>
                          <span>PTR: {p.ptr ? `₹${p.ptr.toFixed(2)}` : '❓'}</span>
                          <span>•</span>
                          <span>Exp: {p.expiry || '❓'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={p.imageStatus} />
                      <Link
                        href={`/review?id=${p.id}`}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audit Log / History Stream (1 Col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm">Recent Audit Trail</h3>
            <span className="text-[11px] text-slate-400">Recorded changes</span>
          </div>

          {recentAuditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No modifications recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="font-medium text-slate-700 truncate max-w-[120px]">
                      {log.product?.productName || 'Product'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-700 font-semibold">
                      {log.source}
                    </span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    {log.fieldName.toUpperCase()}: <span className="text-slate-400 line-through">{log.oldValue || 'none'}</span> → <span className="text-emerald-700 font-bold">{log.newValue}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
