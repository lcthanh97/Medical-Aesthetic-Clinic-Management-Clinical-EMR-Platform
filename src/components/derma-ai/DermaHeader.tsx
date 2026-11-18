'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Database,
  KeyRound,
  Microscope,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  ArrowUpRight,
} from 'lucide-react';

export type ActiveTab = 'consult' | 'crud';

interface DermaHeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  systemOnline: boolean;
  diseaseCount: number;
  adminKey: string;
  consultKey: string;
  onSaveKeys: (adminKey: string, consultKey: string) => void;
}

export function DermaHeader({
  activeTab,
  onTabChange,
  systemOnline,
  diseaseCount,
  adminKey,
  consultKey,
  onSaveKeys,
}: DermaHeaderProps) {
  const [keyPopoverOpen, setKeyPopoverOpen] = useState(false);
  const [draftAdminKey, setDraftAdminKey] = useState(adminKey);
  const [draftConsultKey, setDraftConsultKey] = useState(consultKey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKeys(draftAdminKey.trim(), draftConsultKey.trim());
    setKeyPopoverOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-3 sm:px-6 lg:px-10">
      <div
        className="mx-auto max-w-7xl rounded-2xl px-4 py-3 sm:px-6 transition-all duration-300"
        style={{
          background: 'rgba(255, 255, 255, 0.76)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.65)',
          boxShadow:
            '0 12px 32px -8px rgba(2, 132, 199, 0.08), 0 4px 12px -2px rgba(13, 148, 136, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand Logo + System Status Badge */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => onTabChange('consult')}
              className="group flex items-center gap-3 text-left focus:outline-none"
            >
              <div
                className="relative flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                  boxShadow: '0 8px 20px -4px rgba(13, 148, 136, 0.45)',
                }}
              >
                <Microscope className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-500 ring-2 ring-white" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-lg font-bold tracking-tight text-slate-900">
                    DERMA<span className="text-[#0D9488]">VISION</span> AI
                  </span>
                  <span className="hidden rounded-md bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0D9488] border border-teal-200/70 sm:inline-block">
                    Clinical v2.5
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Hệ thống Chẩn đoán &amp; Tư vấn Chuyên khoa Da liễu
                </p>
              </div>
            </button>

            {/* Live Clinical Status Pill */}
            <div className="hidden xl:flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-50/90 to-sky-50/90 px-3.5 py-1.5 border border-teal-200/60 shadow-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  systemOnline ? 'bg-[#0D9488] animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-700">
                Chuyên khoa Da liễu AI • {systemOnline ? 'Sẵn sàng' : 'Chế độ Cục bộ'}
              </span>
              <span className="ml-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#0284C7] border border-sky-100">
                {diseaseCount} ICD-10
              </span>
            </div>
          </div>

          {/* Primary Navigation Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav
              aria-label="Chuyển khu vực chức năng"
              className="flex items-center rounded-xl bg-slate-100/85 p-1 border border-slate-200/70"
            >
              <button
                type="button"
                onClick={() => onTabChange('consult')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'consult'
                    ? 'bg-white text-[#0D9488] shadow-sm ring-1 ring-teal-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Stethoscope className="h-4 w-4 text-[#0D9488]" />
                <span>Khu vực Chẩn đoán AI</span>
              </button>

              <button
                type="button"
                onClick={() => onTabChange('crud')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  activeTab === 'crud'
                    ? 'bg-white text-[#0284C7] shadow-sm ring-1 ring-sky-500/20'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="h-4 w-4 text-[#0284C7]" />
                <span>Quản lý Tri thức Bệnh lý</span>
                <span className="hidden sm:inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-[#0284C7]">
                  CRUD
                </span>
              </button>
            </nav>

            {/* Security Key Config Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setKeyPopoverOpen((prev) => !prev)}
                title="Cấu hình khóa API (X-Admin-Key / X-Consult-Key)"
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                  adminKey || consultKey
                    ? 'border-teal-300 bg-teal-50/80 text-[#0D9488]'
                    : 'border-slate-200/80 bg-white/80 text-slate-600 hover:border-sky-300 hover:text-[#0284C7]'
                }`}
              >
                <KeyRound className="h-4 w-4" />
              </button>

              {keyPopoverOpen && (
                <form
                  onSubmit={handleSave}
                  className="absolute right-0 mt-2 w-80 rounded-2xl p-4 z-50 text-left"
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                    boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.18)',
                  }}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800">
                      <ShieldCheck className="h-4 w-4 text-[#0D9488]" />
                      Xác thực FastAPI Headers
                    </span>
                    <button
                      type="button"
                      onClick={() => setKeyPopoverOpen(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Đóng
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        X-Admin-Key (CRUD Bệnh lý &amp; Nhật ký)
                      </label>
                      <input
                        type="password"
                        value={draftAdminKey}
                        onChange={(e) => setDraftAdminKey(e.target.value)}
                        placeholder="Nhập DERMA_ADMIN_KEY (nếu bật)"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-800 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        X-Consult-Key (Tư vấn AI tùy chọn)
                      </label>
                      <input
                        type="password"
                        value={draftConsultKey}
                        onChange={(e) => setDraftConsultKey(e.target.value)}
                        placeholder="Nhập DERMA_CONSULT_KEY (nếu bật)"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-800 focus:border-[#0284C7] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full rounded-xl py-2 text-xs font-semibold text-white shadow-sm transition-all hover:opacity-95"
                      style={{
                        background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                      }}
                    >
                      Lưu cấu hình phiên
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Link to Clinic Portal */}
            <Link
              href="/khachhang"
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-teal-300 hover:text-[#0D9488]"
            >
              <span>Cổng Phòng Khám</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Mobile Status Bar */}
        <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/50 pt-2 xl:hidden">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                systemOnline ? 'bg-[#0D9488] animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-medium text-slate-600">
              Chuyên khoa Da liễu AI • {systemOnline ? 'Sẵn sàng' : 'Chế độ Cục bộ'}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0284C7]">
            <Sparkles className="h-3 w-3" /> {diseaseCount} phác đồ ICD-10
          </span>
        </div>
      </div>
    </header>
  );
}
