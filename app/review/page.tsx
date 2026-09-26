'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckSquare,
  Check,
  AlertTriangle,
  Sparkles,
  Bot,
  Sliders,
  Download,
  RefreshCw,
  Image as ImageIcon,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ProductChatAssistant } from '@/components/chat/ProductChatAssistant';

function ReviewContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'split' | 'table'>('split');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form edit fields
  const [editForm, setEditForm] = useState({
    productName: '',
    mrp: '',
    ptr: '',
    expiry: '',
    batchNumber: '',
    brand: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products || []);
        if (data.products?.length > 0) {
          const toSelect = initialId
            ? data.products.find((p: any) => p.id === initialId) || data.products[0]
            : data.products[0];
          selectProduct(toSelect);
        }
      }
    } catch (e) {
      console.error('Failed to load review products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [initialId]);

  const selectProduct = (p: any) => {
    setSelectedProduct(p);
    setEditForm({
      productName: p.productName || '',
      mrp: p.mrp ? String(p.mrp) : '',
      ptr: p.ptr ? String(p.ptr) : '',
      expiry: p.expiry || '',
      batchNumber: p.batchNumber || '',
      brand: p.brand || '',
    });
  };

  const handleSaveForm = async () => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: editForm.productName,
          mrp: editForm.mrp ? parseFloat(editForm.mrp) : null,
          ptr: editForm.ptr ? parseFloat(editForm.ptr) : null,
          expiry: editForm.expiry,
          batchNumber: editForm.batchNumber,
          brand: editForm.brand,
          source: 'MANUAL',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      // Update in state
      setSelectedProduct(data.product);
      setProducts(prev => prev.map(p => (p.id === data.product.id ? data.product : p)));
      alert('Product data saved and marketing image updated!');
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedProduct) return;
    await handleSaveForm();
  };

  const handleReprocess = async () => {
    if (!selectedProduct) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/process`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSelectedProduct(data.product);
        setProducts(prev => prev.map(p => (p.id === data.product.id ? data.product : p)));
        alert('Image successfully cleaned and composited!');
      }
    } catch (err: any) {
      alert(`Reprocess error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const incompleteCount = products.filter(
    p => !p.productName || p.mrp === null || p.ptr === null || !p.expiry
  ).length;

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Review Queue & Quality Control
          </h2>
          <p className="text-sm text-slate-500">
            Verify OCR accuracy, match confidence, and final catalog preview before export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-200 p-0.5 rounded-xl flex text-xs font-semibold">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'split' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Side-by-Side Review
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Review All Before Export
            </button>
          </div>

          <Link
            href="/export"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Proceed to Export
          </Link>
        </div>
      </div>

      {/* Incomplete Products Alert */}
      {incompleteCount > 0 && (
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>
              <strong>{incompleteCount} products require review.</strong> Missing MRP, PTR, or Expiry dates should be filled before final catalog export.
            </span>
          </div>
          <button
            onClick={() => {
              const firstIncomplete = products.find(p => !p.mrp || !p.ptr || !p.expiry);
              if (firstIncomplete) selectProduct(firstIncomplete);
            }}
            className="px-3 py-1 bg-amber-200/60 hover:bg-amber-200 text-amber-900 font-semibold rounded-lg shrink-0 transition"
          >
            Fix Next Missing
          </button>
        </div>
      )}

      {/* VIEW MODE 1: SIDE-BY-SIDE SPLIT VIEW */}
      {viewMode === 'split' && selectedProduct && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Product Selector Sidebar */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 max-h-[750px] overflow-y-auto">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Catalog Products ({products.length})</span>
            </div>

            <div className="space-y-1.5">
              {products.map((p) => {
                const isSelected = p.id === selectedProduct.id;
                const isIncomplete = !p.mrp || !p.ptr || !p.expiry;
                const thumb = p.cleanImageUrl || p.finalImageUrl || p.originalImageUrl;

                return (
                  <button
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt={p.productName} className="w-full h-full object-contain" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-800 truncate">
                        {p.productName}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {isIncomplete ? (
                          <span className="text-amber-600 font-medium flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Needs Data
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Image Comparison (Original vs Clean / Final) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Product Image Inspection</h3>
              <Link
                href={`/studio?id=${selectedProduct.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium"
              >
                <Sliders className="w-3.5 h-3.5" /> Studio Adjustments
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* Left: Original Photo */}
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Original Photo
                </span>
                <div className="aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProduct.originalImageUrl}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                  <a
                    href={selectedProduct.originalImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition"
                  >
                    <Eye className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Center: Final Marketing / Clean Image */}
              <div className="flex flex-col space-y-2">
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider text-center">
                  Final Catalog Canvas
                </span>
                <div className="aspect-square bg-white rounded-xl border border-blue-200 overflow-hidden flex items-center justify-center p-2 relative group shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedProduct.finalImageUrl || selectedProduct.cleanImageUrl || selectedProduct.originalImageUrl}
                    alt="Cleaned"
                    className="w-full h-full object-contain"
                  />
                  <a
                    href={selectedProduct.finalImageUrl || selectedProduct.cleanImageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition"
                  >
                    <Eye className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Resolution: 2000x2000 1:1 Canvas
              </span>
              <button
                onClick={handleReprocess}
                disabled={isProcessing}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                Reprocess Image
              </button>
            </div>
          </div>

          {/* Right: Data Verification & Assistant */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Product Information</h3>
                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-semibold hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {isChatOpen ? 'Close Chat' : 'Chat Assistant'}
                </button>
              </div>

              {/* Data Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={editForm.productName}
                    onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">MRP (₹)</label>
                      <ConfidenceBadge score={selectedProduct.mrpConfidence} />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.mrp}
                      onChange={(e) => setEditForm({ ...editForm, mrp: e.target.value })}
                      placeholder="e.g. 85.00"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">PTR (₹)</label>
                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                        {selectedProduct.ptrSource || 'EXCEL'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.ptr}
                      onChange={(e) => setEditForm({ ...editForm, ptr: e.target.value })}
                      placeholder="e.g. 13.50"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-blue-700 font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Expiry (MM/YYYY)</label>
                      <ConfidenceBadge score={selectedProduct.expiryConfidence} />
                    </div>
                    <input
                      type="text"
                      value={editForm.expiry}
                      onChange={(e) => setEditForm({ ...editForm, expiry: e.target.value })}
                      placeholder="12/2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={editForm.batchNumber}
                      onChange={(e) => setEditForm({ ...editForm, batchNumber: e.target.value })}
                      placeholder="241549"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand / Manufacturer</label>
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  Approve & Save
                </button>
                <button
                  onClick={handleSaveForm}
                  disabled={isProcessing}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Save Edits
                </button>
              </div>
            </div>

            {/* Chat Assistant Drawer */}
            {isChatOpen && (
              <div className="h-[380px]">
                <ProductChatAssistant
                  productId={selectedProduct.id}
                  currentProduct={selectedProduct}
                  onProductUpdated={(updated) => {
                    setSelectedProduct(updated);
                    selectProduct(updated);
                    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
                  }}
                  onClose={() => setIsChatOpen(false)}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: REVIEW ALL BEFORE EXPORT TABLE */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Product Catalog Review Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Review all products prior to exporting Excel. Green checks indicate complete data.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/export"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                Export Excel Catalog
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-12 text-center">Status</th>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">MRP</th>
                  <th className="p-3">PTR</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3 w-20 text-center">Image</th>
                  <th className="p-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isComplete = p.productName && p.mrp && p.ptr && p.expiry;
                  const thumb = p.cleanImageUrl || p.finalImageUrl || p.originalImageUrl;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center">
                        {isComplete ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-bold">
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {p.productName}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        {p.mrp ? `₹${p.mrp.toFixed(2)}` : <span className="text-rose-500 font-normal">Missing</span>}
                      </td>
                      <td className="p-3 font-bold text-blue-700">
                        {p.ptr ? `₹${p.ptr.toFixed(2)}` : <span className="text-amber-500 font-normal">Missing PTR</span>}
                      </td>
                      <td className="p-3 font-semibold text-emerald-800">
                        {p.expiry || <span className="text-rose-500 font-normal">Missing</span>}
                      </td>
                      <td className="p-3 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={thumb} alt={p.productName} className="w-full h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            selectProduct(p);
                            setViewMode('split');
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                        >
                          Review & Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Review Queue...</div>}>
      <ReviewContent />
    </React.Suspense>
  );
}
