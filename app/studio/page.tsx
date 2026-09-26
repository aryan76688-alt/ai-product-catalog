'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sliders,
  RefreshCw,
  Download,
  Image as ImageIcon,
  Check,
  Sparkles,
  Eye,
  ArrowRight,
  Maximize2,
  FileCheck,
} from 'lucide-react';

function StudioContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('id');

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'final' | 'clean' | 'original'>('final');

  // Studio Adjustments
  const [canvasSize, setCanvasSize] = useState<number>(2000);
  const [productScale, setProductScale] = useState<number>(0.80);
  const [brightness, setBrightness] = useState<number>(1.02);
  const [contrast, setContrast] = useState<number>(1.0);
  const [quality, setQuality] = useState<number>(92);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then(res => res.json())
      .then(data => {
        if (data.products?.length > 0) {
          setProducts(data.products);
          const found = initialId
            ? data.products.find((p: any) => p.id === initialId) || data.products[0]
            : data.products[0];
          setSelectedProduct(found);
        }
      })
      .catch(() => {});
  }, [initialId]);

  const handleProcess = async () => {
    if (!selectedProduct) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasSize,
          productScale,
          brightness,
          contrast,
          quality,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process image');

      setSelectedProduct(data.product);
      setProducts(prev => prev.map(p => (p.id === data.product.id ? data.product : p)));
    } catch (err: any) {
      alert(`Studio Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentImageUrl = () => {
    if (!selectedProduct) return null;
    if (activeTab === 'original') return selectedProduct.originalImageUrl;
    if (activeTab === 'clean') return selectedProduct.cleanImageUrl || selectedProduct.originalImageUrl;
    return selectedProduct.finalImageUrl || selectedProduct.cleanImageUrl || selectedProduct.originalImageUrl;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Image Studio
          </h2>
          <p className="text-sm text-slate-500">
            Fine-tune deterministic clean product image scaling, lighting, and marketing panel.
          </p>
        </div>

        {selectedProduct && (
          <div className="flex items-center gap-2">
            <Link
              href={`/review?id=${selectedProduct.id}`}
              className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Edit Data
            </Link>
            <a
              href={getCurrentImageUrl() || '#'}
              download={`product-${selectedProduct.id}-${activeTab}.jpg`}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download {activeTab.toUpperCase()}
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Selector */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 max-h-[700px] overflow-y-auto">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
            Select Product
          </div>
          <div className="space-y-1">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className={`w-full text-left p-2 rounded-xl flex items-center gap-2.5 transition text-xs ${
                  selectedProduct?.id === p.id
                    ? 'bg-blue-50 border border-blue-400 font-semibold text-blue-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {p.cleanImageUrl || p.originalImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cleanImageUrl || p.originalImageUrl} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <span className="truncate">{p.productName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Stage Preview Canvas */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
          {/* Stage Tabs */}
          <div className="flex items-center justify-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('original')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'original' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              1. Original Photo
            </button>
            <button
              onClick={() => setActiveTab('clean')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'clean' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              2. Stage A: Clean Image
            </button>
            <button
              onClick={() => setActiveTab('final')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                activeTab === 'final' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              3. Stage B: Final Catalog
            </button>
          </div>

          {/* Main Visual Display */}
          <div className="flex-1 flex items-center justify-center min-h-[420px] bg-slate-50/70 rounded-xl border border-slate-200 p-4 relative group">
            {getCurrentImageUrl() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getCurrentImageUrl()!}
                alt="Product Preview"
                className="max-h-[420px] max-w-full object-contain drop-shadow-md rounded-lg"
              />
            ) : (
              <div className="text-center text-slate-400 text-xs">
                No image available.
              </div>
            )}

            <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur rounded-md border border-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm">
              Canvas: {canvasSize}x{canvasSize} (1:1)
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              {activeTab === 'final'
                ? 'Final marketing image with bottom MRP / PTR / Expiry panel.'
                : activeTab === 'clean'
                ? 'Stage A clean image on pure white canvas (embedded in Excel column F).'
                : 'Raw original uploaded photo.'}
            </span>
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Rendering...' : 'Render Adjustments'}
            </button>
          </div>
        </div>

        {/* Right: Studio Sliders & Settings */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Studio Controls</h3>
            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
              Deterministic
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Canvas Height Scale (75-85%) */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Product Height Scale</span>
                <span>{Math.round(productScale * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.85"
                step="0.01"
                value={productScale}
                onChange={(e) => setProductScale(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[10px] text-slate-400">Target: 75%–85% of canvas height</span>
            </div>

            {/* Brightness */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Lighting & Brightness</span>
                <span>{brightness.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.90"
                max="1.20"
                step="0.01"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Contrast */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Contrast Balance</span>
                <span>{contrast.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.90"
                max="1.20"
                step="0.01"
                value={contrast}
                onChange={(e) => setContrast(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
            </div>

            {/* Canvas Resolution */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Canvas Resolution</label>
              <select
                value={canvasSize}
                onChange={(e) => setCanvasSize(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900"
              >
                <option value={2000}>2000 x 2000 (Recommended)</option>
                <option value={2400}>2400 x 2400 (Ultra High-Res)</option>
                <option value={1600}>1600 x 1600 (Compact)</option>
              </select>
            </div>

            {/* JPEG Quality */}
            <div>
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>JPEG Studio Quality</span>
                <span>{quality}%</span>
              </div>
              <input
                type="range"
                min="85"
                max="98"
                step="1"
                value={quality}
                onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={handleProcess}
              disabled={isProcessing}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl font-semibold text-xs shadow transition"
            >
              Apply Adjustments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ImageStudioPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading Image Studio...</div>}>
      <StudioContent />
    </React.Suspense>
  );
}
