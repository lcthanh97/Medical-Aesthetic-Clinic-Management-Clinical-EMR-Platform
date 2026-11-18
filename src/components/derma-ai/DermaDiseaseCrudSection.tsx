'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Database,
  Edit3,
  Eye,
  LayoutGrid,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react';
import type {
  DiseaseRecord,
  LogRecord,
  PaginatedResponse,
} from '@/lib/derma-ai/backendBridge';

interface DermaDiseaseCrudSectionProps {
  adminKey: string;
  onDiseasesUpdated: () => void;
}

interface DiseaseFormState {
  icd10_code: string;
  label_en: string;
  label_vi: string;
  symptoms: string;
  home_care: string;
  red_flags: string;
}

const EMPTY_FORM: DiseaseFormState = {
  icd10_code: '',
  label_en: '',
  label_vi: '',
  symptoms: '',
  home_care: '',
  red_flags: '',
};

export function DermaDiseaseCrudSection({
  adminKey,
  onDiseasesUpdated,
}: DermaDiseaseCrudSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [subTab, setSubTab] = useState<'diseases' | 'logs'>('diseases');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [diseases, setDiseases] = useState<DiseaseRecord[]>([]);
  const [totalDiseases, setTotalDiseases] = useState(0);
  const [loading, setLoading] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'true' | 'false'>('all');
  const [logsError, setLogsError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState<DiseaseRecord | null>(null);
  const [deletingDisease, setDeletingDisease] = useState<DiseaseRecord | null>(null);
  const [form, setForm] = useState<DiseaseFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fetchDiseases = React.useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: q.trim(),
        page: '1',
        page_size: '50',
      });
      const res = await fetch(`/api/diseases?${params.toString()}`);
      if (!res.ok) throw new Error('Không thể tải danh sách bệnh lý.');
      const data: PaginatedResponse<DiseaseRecord> = await res.json();
      setDiseases(data.items || []);
      setTotalDiseases(data.total || 0);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi tải dữ liệu.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = React.useCallback(async () => {
    setLogsError(null);
    try {
      const params = new URLSearchParams({ page: '1', page_size: '30' });
      if (logFilter !== 'all') {
        params.set('is_dermatology', logFilter);
      }
      const headers: Record<string, string> = {};
      if (adminKey) headers['X-Admin-Key'] = adminKey;

      const res = await fetch(`/api/logs?${params.toString()}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Yêu cầu X-Admin-Key hợp lệ (${res.status})`);
      }
      const data: PaginatedResponse<LogRecord> = await res.json();
      setLogs(data.items || []);
    } catch (err) {
      setLogsError(
        err instanceof Error ? err.message : 'Không thể tải nhật ký tư vấn.'
      );
    }
  }, [adminKey, logFilter]);

  // Real-time debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDiseases(searchQuery);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchDiseases]);

  useEffect(() => {
    if (subTab === 'logs') {
      fetchLogs();
    }
  }, [subTab, fetchLogs]);

  // Entrance animation
  useEffect(() => {
    if (!sectionRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '[data-crud-reveal]',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, stagger: 0.08, ease: 'power3.out' }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, [subTab]);

  // Modal GSAP animation
  useEffect(() => {
    if ((modalOpen || deletingDisease) && modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { scale: 0.92, y: 20, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.32, ease: 'back.out(1.4)' }
      );
    }
  }, [modalOpen, deletingDisease]);

  const openCreateModal = () => {
    setEditingDisease(null);
    setForm(EMPTY_FORM);
    setFeedback(null);
    setModalOpen(true);
  };

  const openEditModal = (disease: DiseaseRecord) => {
    setEditingDisease(disease);
    setForm({
      icd10_code: disease.icd10_code,
      label_en: disease.label_en,
      label_vi: disease.label_vi,
      symptoms: disease.symptoms.split('\n\nTham khảo dữ liệu ViMedical')[0],
      home_care: disease.home_care,
      red_flags: disease.red_flags,
    });
    setFeedback(null);
    setModalOpen(true);
  };

  const handleSaveDisease = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (adminKey) {
        headers['X-Admin-Key'] = adminKey;
      }

      const url = editingDisease
        ? `/api/diseases/${editingDisease.id}`
        : '/api/diseases';
      const method = editingDisease ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          icd10_code: form.icd10_code.trim().toUpperCase(),
          label_en: form.label_en.trim(),
          label_vi: form.label_vi.trim(),
          symptoms: form.symptoms.trim(),
          home_care: form.home_care.trim(),
          red_flags: form.red_flags.trim(),
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Lỗi lưu dữ liệu (${res.status})`);
      }

      setModalOpen(false);
      setFeedback({
        type: 'success',
        message: editingDisease
          ? `Đã cập nhật phác đồ ${form.label_vi} (${form.icd10_code.toUpperCase()}).`
          : `Đã thêm mới bệnh lý ${form.label_vi} (${form.icd10_code.toUpperCase()}).`,
      });
      await fetchDiseases(searchQuery);
      onDiseasesUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Không thể lưu bệnh lý.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingDisease) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const headers: Record<string, string> = {};
      if (adminKey) headers['X-Admin-Key'] = adminKey;

      const res = await fetch(`/api/diseases/${deletingDisease.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok && res.status !== 204) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `Không thể xóa bệnh lý (${res.status})`);
      }

      const deletedName = deletingDisease.label_vi;
      setDeletingDisease(null);
      setFeedback({
        type: 'success',
        message: `Đã xóa mục bệnh lý "${deletedName}" khỏi kho tri thức.`,
      });
      await fetchDiseases(searchQuery);
      onDiseasesUpdated();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi khi xóa bệnh lý.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardHoverEnter = (el: HTMLElement) => {
    gsap.to(el, {
      scale: 1.03,
      duration: 0.28,
      ease: 'power2.out',
      boxShadow:
        '0 22px 44px -12px rgba(2, 132, 199, 0.20), 0 0 0 1.5px rgba(13, 148, 136, 0.5)',
    });
  };

  const handleCardHoverLeave = (el: HTMLElement) => {
    gsap.to(el, {
      scale: 1,
      duration: 0.28,
      ease: 'power2.out',
      boxShadow: '0 12px 30px -10px rgba(2, 132, 199, 0.08)',
    });
  };

  return (
    <div ref={sectionRef} className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-10">
      {/* Header & Controls */}
      <div
        data-crud-reveal
        className="rounded-3xl p-6 sm:p-7 mb-6"
        style={{
          background: 'rgba(255, 255, 255, 0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.65)',
          boxShadow:
            '0 20px 50px -12px rgba(2, 132, 199, 0.10), 0 4px 16px -2px rgba(13, 148, 136, 0.06)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-[#0284C7] border border-sky-200/70 mb-2">
              <Database className="h-3.5 w-3.5" />
              <span>Quản trị Kho Tri thức Lâm sàng • /api/diseases &amp; /api/logs</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900">
              Hệ thống Quản lý Tri thức Bệnh lý Da liễu (ICD-10)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Dữ liệu chuẩn hóa phục vụ truy xuất RAG tiếng Việt và đối chiếu nhãn mô hình ConvNeXt Vision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Switch between Diseases CRUD and Consultation Logs */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/70">
              <button
                type="button"
                onClick={() => setSubTab('diseases')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  subTab === 'diseases'
                    ? 'bg-white text-[#0D9488] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Danh mục ICD-10 ({totalDiseases})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('logs')}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-1.5 ${
                  subTab === 'logs'
                    ? 'bg-white text-[#0284C7] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>Nhật ký AI (/api/logs)</span>
              </button>
            </div>

            {subTab === 'diseases' && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:opacity-95"
                style={{
                  background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                }}
              >
                <Plus className="h-4 w-4" />
                <span>Thêm Bệnh lý mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & View Toggle Bar */}
        {subTab === 'diseases' && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200/60">
            <div className="relative flex-1 min-w-[260px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm real-time theo tên bệnh (VD: Mụn trứng cá, Vảy nến) hoặc mã ICD-10 (VD: L70.0, C43.9)..."
                className="w-full rounded-2xl border border-slate-200/90 bg-white/90 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-[#0D9488] focus:ring-2 focus:ring-teal-500/20 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-xl border border-slate-200/80 bg-white/80 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    viewMode === 'table'
                      ? 'bg-teal-50 text-[#0D9488]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Bảng dữ liệu</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    viewMode === 'cards'
                      ? 'bg-sky-50 text-[#0284C7]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Thẻ Kính lúp Soi da</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => fetchDiseases(searchQuery)}
                title="Làm mới dữ liệu"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-600 hover:text-[#0D9488]"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-5 flex items-center justify-between rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-teal-50/95 border-teal-200 text-[#0D9488]'
              : 'bg-red-50/95 border-red-200 text-[#EF4444]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Đóng
          </button>
        </div>
      )}

      {/* SUBTAB 1: DISEASES TABLE OR DERMOSCOPY LOUPE CARDS */}
      {subTab === 'diseases' && (
        <>
          {viewMode === 'table' ? (
            <div
              data-crud-reveal
              className="overflow-hidden rounded-3xl"
              style={{
                background: 'rgba(255, 255, 255, 0.82)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.65)',
                boxShadow: '0 20px 50px -12px rgba(2, 132, 199, 0.09)',
              }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 pl-6 pr-3">Mã ICD-10</th>
                      <th className="px-3 py-3.5">Tên Bệnh lý (VI / EN)</th>
                      <th className="px-3 py-3.5">Triệu chứng Nhận diện</th>
                      <th className="px-3 py-3.5">Chăm sóc tại nhà</th>
                      <th className="px-3 py-3.5">Dấu hiệu Cảnh báo (Red Flags)</th>
                      <th className="py-3.5 pl-3 pr-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60 text-xs sm:text-sm">
                    {diseases.map((disease) => {
                      const cleanSymptoms = disease.symptoms.split(
                        '\n\nTham khảo dữ liệu ViMedical'
                      )[0];
                      return (
                        <tr
                          key={disease.id}
                          className="group transition-colors hover:bg-teal-50/40"
                        >
                          <td className="py-4 pl-6 pr-3 align-top">
                            <span className="inline-flex items-center rounded-lg bg-teal-50 px-2.5 py-1 font-mono text-xs font-bold text-[#0D9488] border border-teal-200/70">
                              {disease.icd10_code}
                            </span>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <p className="font-heading font-bold text-slate-900">
                              {disease.label_vi}
                            </p>
                            <p className="font-mono text-[11px] text-slate-400">
                              {disease.label_en}
                            </p>
                          </td>
                          <td className="px-3 py-4 align-top max-w-xs text-xs leading-relaxed text-slate-600">
                            {cleanSymptoms}
                          </td>
                          <td className="px-3 py-4 align-top max-w-xs text-xs leading-relaxed text-slate-600">
                            {disease.home_care}
                          </td>
                          <td className="px-3 py-4 align-top max-w-xs text-xs leading-relaxed text-[#EA580C]">
                            {disease.red_flags}
                          </td>
                          <td className="py-4 pl-3 pr-6 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(disease)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0284C7] hover:text-[#0284C7]"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingDisease(disease)}
                                className="inline-flex items-center gap-1 rounded-xl border border-red-200/80 bg-red-50/60 px-2.5 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {diseases.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-sm text-slate-500">
                          Không tìm thấy bệnh lý nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Dermoscopy Loupe Cards Grid */
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {diseases.map((disease) => {
                const cleanSymptoms = disease.symptoms.split(
                  '\n\nTham khảo dữ liệu ViMedical'
                )[0];
                return (
                  <div
                    key={disease.id}
                    onMouseEnter={(e) => handleCardHoverEnter(e.currentTarget)}
                    onMouseLeave={(e) => handleCardHoverLeave(e.currentTarget)}
                    className="group relative rounded-3xl p-5 flex flex-col justify-between transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.84)',
                      backdropFilter: 'blur(16px)',
                      border: '1px solid rgba(255, 255, 255, 0.7)',
                      boxShadow: '0 12px 30px -10px rgba(2, 132, 199, 0.08)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="rounded-xl bg-teal-50 px-3 py-1 font-mono text-xs font-bold text-[#0D9488] border border-teal-200">
                          ICD-10: {disease.icd10_code}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-2.5 py-0.5 text-[10px] font-semibold text-teal-300 opacity-75 group-hover:opacity-100">
                          <Eye className="h-3 w-3" /> Vision Ready
                        </span>
                      </div>

                      <h3 className="font-heading text-lg font-bold text-slate-900">
                        {disease.label_vi}
                      </h3>
                      <p className="font-mono text-xs text-[#0284C7] mb-3">{disease.label_en}</p>

                      <div className="space-y-2.5 text-xs text-slate-600">
                        <p>
                          <strong className="text-slate-800">Triệu chứng:</strong> {cleanSymptoms}
                        </p>
                        <p>
                          <strong className="text-[#0D9488]">Chăm sóc:</strong> {disease.home_care}
                        </p>
                        <p className="rounded-xl bg-orange-50/90 border border-orange-200/70 p-2.5 text-[#EA580C]">
                          <strong className="inline-flex items-center gap-1 text-[#EF4444]">
                            <ShieldAlert className="h-3.5 w-3.5" /> Red Flags:
                          </strong>{' '}
                          {disease.red_flags}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(disease)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#0284C7] hover:text-[#0284C7]"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingDisease(disease)}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-semibold text-[#EF4444] hover:bg-[#EF4444] hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SUBTAB 2: CONSULTATION LOGS (/api/logs) */}
      {subTab === 'logs' && (
        <div
          data-crud-reveal
          className="rounded-3xl p-6"
          style={{
            background: 'rgba(255, 255, 255, 0.82)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.65)',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="font-heading text-base font-bold text-slate-900">
              Lịch sử Phiên Tư vấn AI Da liễu (/api/logs)
            </h3>
            <div className="flex items-center gap-2">
              {(['all', 'true', 'false'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLogFilter(f)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold border ${
                    logFilter === f
                      ? 'border-[#0D9488] bg-teal-50 text-[#0D9488]'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {f === 'all'
                    ? 'Tất cả phiên'
                    : f === 'true'
                      ? 'Trong phạm vi Da liễu'
                      : 'Ngoài phạm vi (Từ chối)'}
                </button>
              ))}
            </div>
          </div>

          {logsError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-800">
              {logsError} — Nhấn biểu tượng 🔑 trên thanh Header để cấu hình <code>X-Admin-Key</code> nếu máy chủ FastAPI yêu cầu xác thực.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((logItem) => (
                <div
                  key={logItem.id}
                  className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        #{logItem.id}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          logItem.is_dermatology
                            ? 'bg-teal-50 text-[#0D9488] border border-teal-200'
                            : 'bg-sky-50 text-[#0284C7] border border-sky-200'
                        }`}
                      >
                        {logItem.is_dermatology ? 'Da liễu hợp lệ' : 'Ngoài phạm vi'}
                      </span>
                      {logItem.vision_top_prediction && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          Vision: {logItem.vision_top_prediction} ({logItem.vision_confidence?.toFixed(1)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      Câu hỏi (đã ẩn PII): &ldquo;{logItem.user_query}&rdquo;
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-2">{logItem.ai_response}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">
                    {new Date(logItem.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="py-8 text-center text-xs text-slate-500">
                  Chưa có bản ghi nhật ký tư vấn nào.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-2xl rounded-3xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.85)',
              boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.28)',
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-5">
              <div>
                <h2 className="font-heading text-xl font-extrabold text-slate-900">
                  {editingDisease
                    ? `Chỉnh sửa Bệnh lý: ${editingDisease.label_vi}`
                    : 'Thêm mới Bệnh lý Da liễu vào Kho Tri thức'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Định dạng chuẩn ICD-10 (ví dụ: L70.0, L20.9, C43.9)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDisease} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã ICD-10 *
                  </label>
                  <input
                    type="text"
                    required
                    pattern="^[A-Za-z][0-9]{2}(\.[A-Za-z0-9]{1,5})?$"
                    value={form.icd10_code}
                    onChange={(e) => setForm({ ...form, icd10_code: e.target.value.toUpperCase() })}
                    placeholder="VD: L71.9"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nhãn Tiếng Anh (Model Class) *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.label_en}
                    onChange={(e) => setForm({ ...form, label_en: e.target.value })}
                    placeholder="VD: Rosacea"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên Bệnh lý Tiếng Việt *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.label_vi}
                    onChange={(e) => setForm({ ...form, label_vi: e.target.value })}
                    placeholder="VD: Trứng cá đỏ"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Triệu chứng Nhận diện Lâm sàng *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.symptoms}
                  onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                  placeholder="Mô tả các biểu hiện đặc trưng trên da..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0D9488] mb-1">
                  Hướng dẫn Chăm sóc An toàn tại nhà *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.home_care}
                  onChange={(e) => setForm({ ...form, home_care: e.target.value })}
                  placeholder="Các bước vệ sinh, dưỡng ẩm, bảo vệ da không dùng thuốc kê đơn..."
                  className="w-full rounded-xl border border-teal-200 bg-teal-50/30 p-3 text-sm text-slate-900 focus:border-[#0D9488] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#EF4444] mb-1">
                  Dấu hiệu Cảnh báo Đỏ (Red Flags) cần đi khám ngay *
                </label>
                <textarea
                  rows={2}
                  required
                  value={form.red_flags}
                  onChange={(e) => setForm({ ...form, red_flags: e.target.value })}
                  placeholder="Các biểu hiện nhiễm trùng, lan rộng hoặc cấp cứu..."
                  className="w-full rounded-xl border border-orange-200 bg-orange-50/30 p-3 text-sm text-slate-900 focus:border-[#F97316] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #0D9488 0%, #0284C7 100%)',
                  }}
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingDisease
                      ? 'Lưu Cập nhật'
                      : 'Tạo mục Tri thức'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDisease && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs">
          <div
            ref={modalRef}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-100"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-[#EF4444]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">
                  Xác nhận xóa Bệnh lý
                </h3>
                <p className="text-xs text-slate-500">
                  Mã ICD-10: {deletingDisease.icd10_code}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Bạn có chắc chắn muốn xóa mục tri thức{' '}
              <strong className="text-slate-900">{deletingDisease.label_vi}</strong> khỏi cơ sở dữ liệu?
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingDisease(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Giữ lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmDelete}
                className="rounded-xl bg-[#EF4444] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-600 disabled:opacity-50"
              >
                {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
