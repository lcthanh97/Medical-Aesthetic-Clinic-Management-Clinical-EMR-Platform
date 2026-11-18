'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { DermaDiseaseCrudSection } from '@/components/derma-ai/DermaDiseaseCrudSection';

export default function AdminAiKnowledgePage() {
  const [adminKey, setAdminKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    try {
      setAdminKey(sessionStorage.getItem('derma_admin_key') || '');
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl mb-3 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
            <ShieldCheck size={14} /> Không gian Quản trị viên (Admin Portal)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyInput((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-[#0D9488] hover:text-[#0D9488]"
          >
            <KeyRound size={14} />
            <span>{adminKey ? 'Đã cấu hình X-Admin-Key' : 'Cấu hình X-Admin-Key'}</span>
          </button>
        </div>
      </div>

      {showKeyInput && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 mb-4">
          <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-700">
              X-Admin-Key (FastAPI):
            </label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => {
                setAdminKey(e.target.value);
                try {
                  sessionStorage.setItem('derma_admin_key', e.target.value);
                } catch {}
              }}
              placeholder="Nhập DERMA_ADMIN_KEY nếu FastAPI yêu cầu xác thực..."
              className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0D9488] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowKeyInput(false)}
              className="rounded-xl bg-[#0D9488] px-4 py-2 text-xs font-bold text-white"
            >
              Lưu
            </button>
          </div>
        </div>
      )}

      <DermaDiseaseCrudSection
        adminKey={adminKey}
        onDiseasesUpdated={() => {}}
      />
    </div>
  );
}
