'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  Upload,
  Check,
  ArrowRight,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface ColumnMapping {
  productNameColumn: string;
  ptrColumn: string;
  skuColumn?: string;
}

export default function ImportExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({
    productNameColumn: '',
    ptrColumn: '',
    skuColumn: '',
  });

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Upload, 2: Map & Preview, 3: Completed
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);

    const formData = new FormData();
    formData.append('action', 'preview');
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse file');

      setHeaders(data.preview.headers || []);
      setPreviewRows(data.preview.rows || []);
      setTotalRows(data.preview.totalRows || 0);

      const suggested = data.preview.suggestedMapping || {};
      setMapping({
        productNameColumn: suggested.productNameColumn || data.preview.headers[0] || '',
        ptrColumn: suggested.ptrColumn || data.preview.headers[1] || '',
        skuColumn: suggested.skuColumn || '',
      });

      setStep(2);
    } catch (err: any) {
      alert(`Error reading Excel: ${err.message}`);
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!file || !mapping.productNameColumn || !mapping.ptrColumn) {
      alert('Please map both Product Name and PTR columns before importing.');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('action', 'import');
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));

    try {
      const res = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');

      setImportResult(data);
      setStep(3);
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = 'data:text/csv;charset=utf-8,Product Name,PTR,SKU\nRespigreat D15 Syrup,13.50,RESP-01\nAmoxicillin 500mg,24.00,AMOX-500\nParacetamol 650mg,8.25,PARA-650\nAzithromycin 500mg,42.00,AZI-500\nCetirizine 10mg,4.50,CET-10\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'sample_ptr_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Import PTR Pricing Data
          </h2>
          <p className="text-sm text-slate-500">
            Upload Excel or CSV sheets to match PTR prices with product packaging.
          </p>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl shadow-sm transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-600" />
          Download Sample Template
        </button>
      </div>

      {/* Stepper Header */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className={`flex items-center gap-2 font-medium ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            1
          </span>
          <span>Upload File</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 font-medium ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            2
          </span>
          <span>Map Columns & Preview</span>
        </div>
        <div className="h-0.5 w-12 bg-slate-200" />
        <div className={`flex items-center gap-2 font-medium ${step === 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
            3
          </span>
          <span>Auto-Match Complete</span>
        </div>
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-2xl p-12 text-center cursor-pointer transition"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
            }}
          />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-inner">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {isLoading ? 'Reading Excel file...' : 'Choose or drop your Excel/CSV PTR sheet'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Supports .xlsx, .xls, and .csv files. Columns will be auto-detected.
          </p>
        </div>
      )}

      {/* STEP 2: Map & Preview */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Column Mapping Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Step 2: Map Columns</h3>
                <p className="text-xs text-slate-500">
                  Select which columns in &quot;{file?.name}&quot; correspond to product data.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                {totalRows} rows detected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Product Name Column */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Product Name Column <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mapping.productNameColumn}
                  onChange={(e) => setMapping({ ...mapping, productNameColumn: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* PTR Column */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  PTR / Rate Column <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mapping.ptrColumn}
                  onChange={(e) => setMapping({ ...mapping, ptrColumn: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                >
                  <option value="">Select column...</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU / Code Column (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  SKU / Code Column (Optional)
                </label>
                <select
                  value={mapping.skuColumn || ''}
                  onChange={(e) => setMapping({ ...mapping, skuColumn: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium"
                >
                  <option value="">None</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Preview (First {previewRows.length} Rows)</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                  <tr>
                    {headers.map((h) => (
                      <th
                        key={h}
                        className={`p-3 ${
                          h === mapping.productNameColumn
                            ? 'bg-blue-100/50 text-blue-900'
                            : h === mapping.ptrColumn
                            ? 'bg-emerald-100/50 text-emerald-900'
                            : ''
                        }`}
                      >
                        {h}
                        {h === mapping.productNameColumn && (
                          <span className="block text-[10px] text-blue-600 font-normal">→ Product Name</span>
                        )}
                        {h === mapping.ptrColumn && (
                          <span className="block text-[10px] text-emerald-600 font-normal">→ PTR</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      {headers.map((h) => (
                        <td key={h} className="p-3 font-medium text-slate-800">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Choose Different File
              </button>
              <button
                onClick={handleCommitImport}
                disabled={isLoading || !mapping.productNameColumn || !mapping.ptrColumn}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Confirm & Match with Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Completed */}
      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">
            PTR Data Successfully Imported!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Imported <strong>{importResult?.totalRows}</strong> records. Automatically matched <strong>{importResult?.matchedCount}</strong> products with PTR pricing.
          </p>
          <div className="flex items-center justify-center gap-3 pt-3">
            <button
              onClick={() => router.push('/review')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow transition"
            >
              Go to Review Queue
            </button>
            <button
              onClick={() => {
                setStep(1);
                setFile(null);
                setImportResult(null);
              }}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Import Another Sheet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
