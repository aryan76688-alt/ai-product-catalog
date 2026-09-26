'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileCheck,
  Check,
  ShieldCheck,
} from 'lucide-react';

export default function ExportPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [mode, setMode] = useState<'clean' | 'marketing'>('clean');
  const [includeIncomplete, setIncludeIncomplete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?limit=500')
      .then(res => res.json())
      .then(data => {
        if (data.products) {
          setProducts(data.products);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const completeProducts = products.filter(
    p => p.productName && p.mrp !== null && p.ptr !== null && p.expiry
  );
  const incompleteProducts = products.filter(
    p => !p.productName || p.mrp === null || p.ptr === null || !p.expiry
  );

  const exportCount = includeIncomplete ? products.length : completeProducts.length;

  const handleExport = async () => {
    if (exportCount === 0) {
      alert('No products available for export.');
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          includeIncomplete,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Product_Catalog_${mode === 'marketing' ? 'Marketing' : 'Clean'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Export Excel Product Catalog
        </h2>
        <p className="text-sm text-slate-500">
          Generate a finalized Excel workbook with real product images embedded into cell F.
        </p>
      </div>

      {/* Quality Control Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">Quality Control Verification</h3>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-full text-slate-700">
            {products.length} Total Catalog Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <div className="text-lg font-bold text-emerald-900">
                {completeProducts.length} Verified Products
              </div>
              <p className="text-xs text-emerald-700">
                All 5 required fields present (Name, MRP, PTR, Expiry, Image).
              </p>
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-center gap-3 ${
            incompleteProducts.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <AlertTriangle className={`w-8 h-8 shrink-0 ${incompleteProducts.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            <div>
              <div className="text-lg font-bold text-slate-900">
                {incompleteProducts.length} Incomplete Products
              </div>
              <p className="text-xs text-slate-500">
                {incompleteProducts.length > 0 ? (
                  <Link href="/review" className="text-amber-700 font-semibold hover:underline">
                    Click to review missing data before export →
                  </Link>
                ) : (
                  'Zero missing fields! Ready for full catalog export.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Choose Export Mode</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode A: Clean Product Image */}
          <div
            onClick={() => setMode('clean')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
              mode === 'clean'
                ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  Export Mode A: Clean Product Image (Default)
                </span>
                {mode === 'clean' && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Embeds pure clean product images on white canvas into Column F without text overlays. Recommended for wholesale, pharmacy inventory, and B2B distributor catalogs.
              </p>
            </div>
            <span className="mt-3 inline-block text-[11px] font-semibold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded w-max">
              Recommended Default
            </span>
          </div>

          {/* Mode B: Final Marketing Image */}
          <div
            onClick={() => setMode('marketing')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
              mode === 'marketing'
                ? 'border-blue-600 bg-blue-50/40 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">
                  Export Mode B: Final Marketing Image
                </span>
                {mode === 'marketing' && <Check className="w-4 h-4 text-blue-600" />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Includes the bottom information card with red MRP, blue PTR, and green Expiry rendered at the base of the image in Column F.
              </p>
            </div>
            <span className="mt-3 inline-block text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2.5 py-0.5 rounded w-max">
              Marketing / Display
            </span>
          </div>
        </div>

        {/* Incomplete items checkbox */}
        {incompleteProducts.length > 0 && (
          <div className="pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeIncomplete}
                onChange={(e) => setIncludeIncomplete(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>
                Export incomplete products ({incompleteProducts.length} rows with missing data will be included)
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Export Action Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-base">Ready to Export Workbook</h4>
          <p className="text-xs text-slate-300 mt-0.5">
            Will generate .xlsx with columns: Sr No., Product Name, MRP, PTR, Expiry, Products Images.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || exportCount === 0}
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-bold rounded-xl text-sm shadow-lg transition"
        >
          {isExporting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating Excel & Embedding Images...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download Excel Catalog ({exportCount} Products)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
