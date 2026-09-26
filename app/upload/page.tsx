'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  FileCheck,
  RefreshCw,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';

interface UploadItem {
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
  productId?: string;
  error?: string;
}

export default function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [autoProcess, setAutoProcess] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    const newItems: UploadItem[] = [];

    Array.from(files).forEach((file) => {
      if (allowed.includes(file.type) || file.name.match(/\.(jpe?g|png|webp)$/i)) {
        newItems.push({
          file,
          previewUrl: URL.createObjectURL(file),
          status: 'pending',
          progress: 0,
        });
      }
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  };

  const uploadAll = async () => {
    const pendingItems = items.filter((i) => i.status === 'pending');
    if (pendingItems.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('autoProcess', String(autoProcess));

    pendingItems.forEach((item) => {
      formData.append('files', item.file);
    });

    // Mark as uploading
    setItems((prev) =>
      prev.map((i) => (i.status === 'pending' ? { ...i, status: 'uploading', progress: 40 } : i))
    );

    try {
      const res = await fetch('/api/uploads/images', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload images');

      setItems((prev) =>
        prev.map((i) => ({ ...i, status: 'uploaded', progress: 100 }))
      );

      if (autoProcess) {
        setTimeout(() => {
          router.push('/processing');
        }, 1500);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
      setItems((prev) =>
        prev.map((i) => (i.status === 'uploading' ? { ...i, status: 'failed', error: err.message } : i))
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Upload Product Images
          </h2>
          <p className="text-sm text-slate-500">
            Upload raw pharmaceutical product photos. Supports JPG, PNG, and WebP (up to 500+ images).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200 cursor-pointer shadow-sm">
            <input
              type="checkbox"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Auto-run AI analysis & cleaning</span>
          </label>

          {items.length > 0 && (
            <button
              onClick={uploadAll}
              disabled={isUploading || items.every((i) => i.status === 'uploaded')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded-xl shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'Uploading...' : `Upload & Process (${items.filter((i) => i.status === 'pending').length})`}
            </button>
          )}
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shadow-inner">
          <Upload className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          Drop product images here, or browse
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          High-resolution photos of medicine bottles, blister packs, boxes, and tubes.
        </p>
        <span className="inline-block mt-3 px-3 py-1 bg-slate-100 text-slate-600 text-[11px] rounded-full font-medium">
          Supported: JPG, JPEG, PNG, WEBP
        </span>
      </div>

      {/* Upload Items Queue */}
      {items.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm">
              Queued Images ({items.length})
            </h3>
            <button
              onClick={() => setItems([])}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear list
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 relative group"
              >
                <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={item.file.name}>
                    {item.file.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    {item.status === 'pending' && (
                      <span className="text-[10px] text-slate-500">Ready to upload</span>
                    )}
                    {item.status === 'uploading' && (
                      <span className="text-[10px] text-blue-600 font-medium animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {item.status === 'uploaded' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Uploaded
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-600 font-medium">
                        <AlertCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                </div>

                {item.status === 'pending' && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              {items.filter((i) => i.status === 'uploaded').length} of {items.length} uploaded
            </span>
            <button
              onClick={uploadAll}
              disabled={isUploading || items.every((i) => i.status === 'uploaded')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Upload & Process All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
