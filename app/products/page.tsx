'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Image as ImageIcon,
  Edit,
  Sliders,
  Trash2,
  RefreshCw,
  Plus,
  ArrowUpDown,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ConfidenceBadge } from '@/components/common/ConfidenceBadge';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        filter,
        page: String(page),
        limit: '25',
      });
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, filter, page]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (e) {
      alert('Delete failed');
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All Products' },
    { key: 'ready', label: 'Ready' },
    { key: 'needs_review', label: 'Needs Review' },
    { key: 'missing_ptr', label: 'Missing PTR' },
    { key: 'missing_mrp', label: 'Missing MRP' },
    { key: 'missing_expiry', label: 'Missing Expiry' },
    { key: 'failed', label: 'Failed' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Products Catalog
          </h2>
          <p className="text-sm text-slate-500">
            Manage product images, OCR extraction, PTR pricing, and catalog status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Images
          </Link>
          <Link
            href="/review"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition"
          >
            Review Queue
          </Link>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, batch number, or brand..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900"
            />
          </div>

          <button
            onClick={fetchProducts}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setFilter(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                filter === tab.key
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 w-16 text-center">Sr.</th>
                <th className="p-3.5 w-20">Image</th>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">MRP</th>
                <th className="p-3.5">PTR</th>
                <th className="p-3.5">Expiry</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No products found matching criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const displayImg = p.cleanImageUrl || p.finalImageUrl || p.originalImageUrl;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 text-center font-bold text-slate-500">
                        {p.srNo || '-'}
                      </td>
                      <td className="p-3.5">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                          {displayImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={displayImg} alt={p.productName} className="w-full h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900 text-sm max-w-xs truncate" title={p.productName}>
                          {p.productName}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {p.brand && <span>Brand: {p.brand}</span>}
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.batchNumber && <span>Batch: {p.batchNumber}</span>}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {p.mrp ? (
                          <div className="space-y-1">
                            <span className="font-bold text-slate-900">₹{p.mrp.toFixed(2)}</span>
                            <div>
                              <ConfidenceBadge score={p.mrpConfidence} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-medium">Missing</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.ptr ? (
                          <div className="space-y-1">
                            <span className="font-bold text-blue-700">₹{p.ptr.toFixed(2)}</span>
                            <div>
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                                {p.ptrSource || 'EXCEL'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-500 font-medium">Missing PTR</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {p.expiry ? (
                          <div className="space-y-1">
                            <span className="font-semibold text-emerald-800">{p.expiry}</span>
                            <div>
                              <ConfidenceBadge score={p.expiryConfidence} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-medium">Missing</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={p.imageStatus} />
                      </td>
                      <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                        <Link
                          href={`/review?id=${p.id}`}
                          className="inline-flex p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Review & Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/studio?id=${p.id}`}
                          className="inline-flex p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Image Studio"
                        >
                          <Sliders className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="space-x-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-slate-100 disabled:opacity-50 rounded-lg"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-slate-100 disabled:opacity-50 rounded-lg"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
