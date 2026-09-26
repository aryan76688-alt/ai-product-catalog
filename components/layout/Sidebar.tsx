'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Upload,
  FileSpreadsheet,
  Cpu,
  CheckSquare,
  Sliders,
  Download,
  Settings,
  Sparkles,
} from 'lucide-react';

export const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Upload Images', href: '/upload', icon: Upload },
  { name: 'Import Excel', href: '/import', icon: FileSpreadsheet },
  { name: 'AI Processing', href: '/processing', icon: Cpu },
  { name: 'Review Queue', href: '/review', icon: CheckSquare },
  { name: 'Image Studio', href: '/studio', icon: Sliders },
  { name: 'Export', href: '/export', icon: Download },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen shrink-0">
      {/* Brand Logo & Name */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 leading-tight text-base tracking-tight">
            AI Product Catalog
          </h1>
          <span className="text-[11px] font-medium text-slate-500">
            Image & Data Updater
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm shadow-blue-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Safety Notice Footer */}
      <div className="p-4 m-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Deterministic Pipeline
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Medicine packaging & labels are strictly preserved without generative hallucination.
        </p>
      </div>
    </aside>
  );
}
