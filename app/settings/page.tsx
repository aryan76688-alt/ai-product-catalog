'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Key,
  Database,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini'>('openai');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSettings(data.settings);
          setSelectedProvider(data.settings.aiProvider);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: selectedProvider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      alert(`Active AI provider changed to ${selectedProvider.toUpperCase()}!`);
    } catch (err: any) {
      alert(`Settings error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Application Settings
        </h2>
        <p className="text-sm text-slate-500">
          Configure AI provider architecture, vision models, database, and storage parameters.
        </p>
      </div>

      {/* AI Provider Architecture Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">AI Provider Selection</h3>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
            Swappable Layer
          </span>
        </div>

        <p className="text-xs text-slate-500">
          The application supports dynamic switching between OpenAI Vision and Google Gemini without rewriting any business logic.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* OpenAI Option */}
          <div
            onClick={() => setSelectedProvider('openai')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
              selectedProvider === 'openai'
                ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">OpenAI Provider</span>
                {settings?.openai?.configured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> Missing Key
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Uses GPT-4o / GPT-4o-mini with structured JSON outputs for medicine packaging OCR and product disambiguation.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 font-mono">
              Key: {settings?.openai?.maskedKey || 'Not configured'}
            </div>
          </div>

          {/* Gemini Option */}
          <div
            onClick={() => setSelectedProvider('gemini')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
              selectedProvider === 'gemini'
                ? 'border-blue-600 bg-blue-50/30 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900">Google Gemini Provider</span>
                {settings?.gemini?.configured ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" /> Missing Key
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Uses Gemini 2.5 Flash with multimodal native image comprehension and strict JSON schemas.
              </p>
            </div>
            <div className="mt-3 text-[11px] text-slate-400 font-mono">
              Key: {settings?.gemini?.maskedKey || 'Not configured'}
            </div>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>

      {/* Database & Storage Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Database className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Database & Object Storage Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-700 block">Database Engine</span>
            <span className="text-slate-900 font-medium">
              Prisma ORM (PostgreSQL in Production / SQLite in Local Dev)
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports persistent PostgreSQL on Railway or Supabase.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="font-semibold text-slate-700 block">Storage Provider</span>
            <span className="text-slate-900 font-medium capitalize">
              {settings?.storageProvider || 'Local Disk'} (/uploads)
            </span>
            <p className="text-[11px] text-slate-500 mt-1">
              Separate directories for original/, clean/, and final/ assets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
