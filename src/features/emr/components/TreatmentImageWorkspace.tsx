'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Eye, EyeOff, FileImage, Image as ImageIcon, Loader2, RefreshCw, ShieldCheck, Upload, X, ZoomIn } from 'lucide-react';
import {
  addTreatmentImageNote,
  compareTreatmentImages,
  getTreatmentImageAudit,
  getTreatmentImageDetails,
  getTreatmentImageUploadOptions,
  getTreatmentImageWorkspace,
  setTreatmentImageHidden,
} from '@/features/emr/images/actions';

type Patient = { id: string; fullName: string; patientCode: string; visits?: Array<{ id: string; visitDate: string; status: string }> };
type Props = {
  patients: Patient[];
  initialPatientId: string;
  initialImages: any[];
  initialPermissions?: { canUpload: boolean; canNote: boolean; canHide: boolean; canAudit: boolean };
  initialError?: string;
  storageConfigured: boolean;
  canReadImages: boolean;
};

const EMPTY_FILTERS = { visitId: '', planId: '', sessionId: '', phase: '', imageType: '', bodyArea: '', from: '', to: '', sort: 'newest' as 'newest' | 'oldest', showHidden: false };
const PHASES = ['BEFORE', 'DURING', 'AFTER', 'FOLLOW_UP'];
const TYPES = ['CLINICAL', 'DERMOSCOPY'];
const WARNING_COPY: Record<string, string> = {
  KHAC_VUNG_DA: 'Hai ảnh khác vùng da hoặc chưa đủ dữ liệu vùng da.',
  KHAC_LOAI_ANH: 'Hai ảnh khác loại ảnh.',
  THU_TU_THOI_GIAN_NGUOC: 'Thời điểm chụp không theo thứ tự BEFORE rồi AFTER.',
  KHAC_KE_HOACH: 'Hai ảnh thuộc kế hoạch điều trị khác nhau.',
};

function localDate(value: string | Date) {
  return new Date(value).toLocaleString('vi-VN');
}

function dateGroup(value: string | Date) {
  return new Date(value).toLocaleDateString('sv-SE');
}

function formatBytes(value?: number | null) {
  if (!value) return 'Chưa có metadata dung lượng';
  return value < 1024 * 1024 ? `${(value / 1024).toFixed(0)} KB` : `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export function TreatmentImageWorkspace({ patients, initialPatientId, initialImages, initialPermissions, initialError = '', storageConfigured, canReadImages }: Props) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const [images, setImages] = useState<any[]>(initialImages);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [permissions, setPermissions] = useState(initialPermissions ?? { canUpload: false, canNote: false, canHide: false, canAudit: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [lastTrace, setLastTrace] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [details, setDetails] = useState<any>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [comparisonError, setComparisonError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [notice, setNotice] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadOptions, setUploadOptions] = useState<any[]>([]);
  const [uploadOptionsLoading, setUploadOptionsLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ visitId: '', planId: '', sessionId: '', bodyArea: '', phase: 'BEFORE', imageType: 'CLINICAL', capturedAt: new Date().toISOString().slice(0, 16), description: '' });
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [hideReason, setHideReason] = useState('');
  const [confirmAction, setConfirmAction] = useState<'hide' | 'restore' | null>(null);
  const [linkModal, setLinkModal] = useState<'visit' | 'session' | null>(null);
  const [auditRows, setAuditRows] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditAction, setAuditAction] = useState('');

  const selectedPatient = patients.find((patient) => patient.id === patientId) ?? null;
  const selectedPlan = uploadOptions.flatMap((visit) => visit.plans).find((plan) => plan.id === uploadForm.planId);
  const groupedImages = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const image of images) {
      const key = dateGroup(image.capturedAt);
      groups.set(key, [...(groups.get(key) ?? []), image]);
    }
    return [...groups.entries()];
  }, [images]);

  const updateUrl = useCallback((nextPatientId: string, nextFilters: typeof EMPTY_FILTERS) => {
    const params = new URLSearchParams();
    if (nextPatientId) params.set('patientId', nextPatientId);
    for (const key of ['visitId', 'planId', 'sessionId', 'phase', 'imageType', 'bodyArea', 'from', 'to', 'sort'] as const) {
      const value = nextFilters[key];
      if (value) params.set(key, value);
    }
    if (nextFilters.showHidden) params.set('showHidden', 'true');
    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  const loadImages = useCallback(async (nextPatientId = patientId, nextFilters = filters) => {
    if (!nextPatientId || !canReadImages) return;
    setLoading(true);
    setError('');
    const result = await getTreatmentImageWorkspace(nextPatientId, nextFilters);
    setLastTrace(result.trace ?? []);
    if (result.success) {
      setImages(result.data);
      setPermissions(result.permissions);
      setSelectedId((current) => result.data.some((image: any) => image.id === current) ? current : '');
      setDetails(null);
      setComparison(null);
      updateUrl(nextPatientId, nextFilters);
    } else {
      setImages([]);
      setPermissions({ canUpload: false, canNote: false, canHide: false, canAudit: false });
      setError(result.message);
    }
    setLoading(false);
  }, [canReadImages, filters, patientId, updateUrl]);

  useEffect(() => {
    if (patientId && patientId !== initialPatientId) void loadImages(patientId, filters);
  }, [patientId, initialPatientId, filters, loadImages]);

  async function openDetails(imageId: string) {
    setSelectedId(imageId);
    setComparison(null);
    setLastTrace([]);
    const result = await getTreatmentImageDetails(patientId, imageId);
    setLastTrace(result.trace ?? []);
    if (!result.success) {
      setNotice(result.message);
      return;
    }
    setDetails(result.data);
  }

  function toggleCompare(imageId: string) {
    setCompareIds((current) => {
      if (current.includes(imageId)) return current.filter((value) => value !== imageId);
      return current.length < 2 ? [...current, imageId] : [current[1], imageId];
    });
    setComparison(null);
  }

  async function runComparison(ids = compareIds) {
    if (ids.length !== 2) return;
    setComparisonError('');
    const result = await compareTreatmentImages(patientId, [ids[0], ids[1]]);
    setLastTrace(result.trace ?? []);
    if (result.success) setComparison(result.data);
    else setComparisonError(result.message);
  }

  async function beginUpload() {
    setShowUpload(true);
    setUploadError('');
    setUploadOptionsLoading(true);
    const result = await getTreatmentImageUploadOptions(patientId);
    setLastTrace(result.trace ?? []);
    if (!result.success) setUploadError(result.message);
    else {
      setUploadOptions(result.data);
      const firstVisit = result.data[0];
      const firstPlan = firstVisit?.plans?.[0];
      setUploadForm((current) => ({ ...current, visitId: firstVisit?.id ?? '', planId: firstPlan?.id ?? '', sessionId: '' }));
    }
    setUploadOptionsLoading(false);
  }

  async function submitUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError('');
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set('patientId', patientId);
    data.set('visitId', uploadForm.visitId);
    data.set('planId', uploadForm.planId);
    data.set('sessionId', uploadForm.sessionId);
    for (const [key, value] of Object.entries(uploadForm)) data.set(key, value);
    const input = form.querySelector<HTMLInputElement>('input[type="file"]');
    if (input?.files?.[0]) data.set('file', input.files[0]);
    setUploading(true);
    try {
      const response = await fetch('/api/bacsi/images', { method: 'POST', body: data, cache: 'no-store' });
      const result = await response.json();
      setLastTrace(result.trace ?? []);
      if (!response.ok || !result.success) {
        setUploadError(result.message || 'Không thể tải ảnh lên.');
      } else {
        setShowUpload(false);
        setNotice('Đã tải ảnh và ghi nhật ký thao tác.');
        await loadImages(patientId, filters);
        await openDetails(result.data.id);
      }
    } catch {
      setUploadError('Không kết nối được với máy chủ. Hãy thử lại.');
    } finally {
      setUploading(false);
    }
  }

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!details || !noteText.trim()) return;
    setSavingNote(true);
    const latestVersion = details.notes?.[0]?.version ?? 0;
    const result = await addTreatmentImageNote({ patientId, imageId: details.id, text: noteText, expectedLatestVersion: latestVersion });
    setLastTrace(result.trace ?? []);
    if (!result.success) setNotice(result.message);
    else {
      setNoteText('');
      setNotice('Đã thêm phiên bản ghi chú mới.');
      await openDetails(details.id);
      await loadImages(patientId, filters);
    }
    setSavingNote(false);
  }

  async function applyHideRestore() {
    if (!details) return;
    const restore = details.isHidden;
    const result = await setTreatmentImageHidden({ patientId, imageId: details.id, reason: hideReason, restore });
    setLastTrace(result.trace ?? []);
    if (!result.success) setNotice(result.message);
    else {
      setNotice(restore ? 'Đã khôi phục ảnh.' : 'Đã ẩn ảnh; tệp gốc vẫn được giữ.');
      setConfirmAction(null);
      setHideReason('');
      await loadImages(patientId, filters);
    }
  }

  async function loadAudit() {
    setAuditLoading(true);
    const result = await getTreatmentImageAudit(patientId, auditAction || undefined);
    setLastTrace(result.trace ?? []);
    if (result.success) setAuditRows(result.data);
    else setNotice(result.message);
    setAuditLoading(false);
  }

  function exportAuditCsv() {
    const rows = [['Thời điểm', 'Tài khoản', 'Hành động', 'Thực thể', 'Mã thực thể', 'IP'], ...auditRows.map((row) => [localDate(row.createdAt), row.username, row.action, row.entity, row.entityId, row.ipAddress])];
    const blob = new Blob([`\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'nhat-ky-anh-theo-doi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const uniqueValues = (key: 'bodyArea' | 'planId' | 'sessionId') => [...new Set(images.map((image) => image[key]).filter(Boolean))] as string[];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="min-w-64 text-sm font-semibold text-slate-700">Bệnh nhân được phân công
          <select value={patientId} onChange={(event) => { setPatientId(event.target.value); setFilters(EMPTY_FILTERS); setDetails(null); setComparison(null); setCompareIds([]); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal">
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.patientCode}</option>)}
          </select>
        </label>
        {selectedPatient && <div className="text-sm text-slate-600"><strong className="text-slate-900">{selectedPatient.fullName}</strong><span className="ml-2">{selectedPatient.patientCode}</span><span className="ml-2">{selectedPatient.visits?.length ?? 0} lượt được phân công</span></div>}
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadImages()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><RefreshCw size={16} /> Tải lại dữ liệu</button>
          {permissions.canUpload && <button type="button" onClick={() => void beginUpload()} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Upload size={16} /> Thêm ảnh theo dõi</button>}
        </div>
      </div>

      {!storageConfigured && <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Kho ảnh riêng tư chưa được cấu hình trong môi trường chạy. Metadata vẫn đọc từ Neon; không dùng ảnh minh họa hoặc URL công khai.</div>}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(event) => { event.preventDefault(); void loadImages(); }}>
        <label className="text-xs font-semibold text-slate-600">Vùng da<select value={filters.bodyArea} onChange={(event) => setFilters((value) => ({ ...value, bodyArea: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"><option value="">Tất cả</option>{uniqueValues('bodyArea').map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Pha<select value={filters.phase} onChange={(event) => setFilters((value) => ({ ...value, phase: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"><option value="">Tất cả</option>{PHASES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Loại ảnh<select value={filters.imageType} onChange={(event) => setFilters((value) => ({ ...value, imageType: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"><option value="">Tất cả</option>{TYPES.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Kế hoạch<select value={filters.planId} onChange={(event) => setFilters((value) => ({ ...value, planId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"><option value="">Tất cả</option>{uniqueValues('planId').map((value) => <option key={value} value={value}>{images.find((image) => image.planId === value)?.plan.name ?? value}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Buổi điều trị<select value={filters.sessionId} onChange={(event) => setFilters((value) => ({ ...value, sessionId: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"><option value="">Tất cả</option>{uniqueValues('sessionId').map((value) => <option key={value} value={value}>Buổi {images.find((image) => image.sessionId === value)?.session?.sessionNo ?? value}</option>)}</select></label>
        <label className="text-xs font-semibold text-slate-600">Từ ngày<input type="date" value={filters.from} onChange={(event) => setFilters((value) => ({ ...value, from: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold text-slate-600">Đến ngày<input type="date" value={filters.to} onChange={(event) => setFilters((value) => ({ ...value, to: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal" /></label>
        <label className="text-xs font-semibold text-slate-600">Sắp xếp<select value={filters.sort} onChange={(event) => setFilters((value) => ({ ...value, sort: event.target.value as 'newest' | 'oldest' }))} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"><option value="newest">Mới nhất trước</option><option value="oldest">Cũ nhất trước</option></select></label>
        {permissions.canHide && <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700"><input type="checkbox" checked={filters.showHidden} onChange={(event) => setFilters((value) => ({ ...value, showHidden: event.target.checked }))} /> Hiện ảnh đã ẩn</label>}
        <div className="flex items-end gap-2"><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Lọc</button><button type="button" onClick={() => { setFilters(EMPTY_FILTERS); void loadImages(patientId, EMPTY_FILTERS); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Xóa lọc</button></div>
      </form>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(390px,0.8fr)]">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Dòng thời gian</h2><span className="text-sm text-slate-600">{images.length} ảnh · {filters.sort === 'newest' ? 'mới nhất trước' : 'cũ nhất trước'}</span></div>
          {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={18} /> Đang tải metadata…</div> : images.length === 0 ? <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">Chưa có ảnh trong Visit được phân công hoặc không có ảnh khớp bộ lọc.</div> : groupedImages.map(([day, dayImages]) => <div key={day} className="border-l-2 border-blue-200 pl-4"><h3 className="mb-3 font-semibold text-slate-800">{new Date(`${day}T00:00:00`).toLocaleDateString('vi-VN')}</h3><div className="space-y-3">{dayImages.map((image) => <article key={image.id} className={`rounded-lg border p-3 ${selectedId === image.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
              <div className="flex gap-3"><button type="button" onClick={() => void openDetails(image.id)} className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md bg-slate-100 text-slate-400" aria-label={`Mở chi tiết ảnh ${image.id}`}><ImageIcon className="absolute inset-0 m-auto" size={24} /><img src={`/api/bacsi/images/${encodeURIComponent(image.id)}/content`} alt="" loading="lazy" className="absolute inset-0 h-full w-full bg-white object-cover" onError={(event) => event.currentTarget.classList.add('hidden')} /></button><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><button type="button" onClick={() => void openDetails(image.id)} className="text-left font-semibold text-slate-900">{localDate(image.capturedAt)}</button><label className="flex shrink-0 items-center gap-1 text-xs text-slate-600"><input type="checkbox" checked={compareIds.includes(image.id)} onChange={() => toggleCompare(image.id)} aria-label={`Chọn ảnh ${image.id} để so sánh`} /> So sánh</label></div><p className="mt-1 text-sm text-slate-700">{image.phase} · {image.imageType} · {image.bodyArea || 'Chưa ghi vùng da'}</p><p className="mt-1 text-xs text-slate-500">{image.plan.name}{image.session ? ` · Buổi ${image.session.sessionNo}` : ' · Lượt khám'}{image.capturedBy?.fullName ? ` · ${image.capturedBy.fullName}` : ''}</p>{image.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{image.description}</p>}{image.isHidden && <span className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900"><EyeOff size={12} /> Đã ẩn</span>}</div></div>
            </article>)}</div></div>)}
        </section>

        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">So sánh trước / sau</h2><div className="flex gap-2"><button type="button" disabled={compareIds.length !== 2} onClick={() => void runComparison()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">So sánh {compareIds.length}/2</button>{comparison && <button type="button" onClick={() => setCompareIds([...comparison.images].reverse().map((image: any) => image.id))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold"><ArrowLeftRight size={14} /> Hoán đổi</button>}</div></div>
            {comparisonError && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{comparisonError}</p>}
            {!comparison ? <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">Chọn 2 ảnh ở dòng thời gian để so sánh.</p> : <>
              {comparison.warnings?.length > 0 && <div role="status" className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Cảnh báo metadata</p>{comparison.warnings.map((warning: string) => <p key={warning}>• {WARNING_COPY[warning] ?? warning}</p>)}</div>}
              <div className="grid grid-cols-2 gap-2">{comparison.images.map((image: any, index: number) => <div key={image.id}><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100"><ImageIcon className="text-slate-400" /><img src={`/api/bacsi/images/${encodeURIComponent(image.id)}/content`} alt={`Ảnh so sánh ${index + 1}`} className="absolute inset-0 h-full w-full bg-white object-contain" style={{ transform: `scale(${zoom})` }} onError={(event) => event.currentTarget.classList.add('hidden')} /></div><p className="mt-1 text-xs font-semibold text-slate-800">{image.phase} · {image.imageType}</p><p className="text-xs text-slate-600">{localDate(image.capturedAt)} · {image.bodyArea || 'Chưa ghi vùng da'}</p></div>)}</div>
              <label className="flex items-center gap-2 text-xs text-slate-600"><ZoomIn size={15} /> Zoom đồng bộ<input type="range" min="1" max="2.5" step="0.1" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="flex-1" /><span>{zoom.toFixed(1)}×</span></label><button type="button" onClick={() => setZoom(1)} className="text-xs font-semibold text-blue-700">Đặt lại zoom</button>
              <p className="text-xs text-slate-500">Hệ thống không tự đánh giá hiệu quả điều trị. Nhận định do bác sĩ ghi nhận.</p>
            </>}
          </section>

          {details && <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">Chi tiết ảnh đang chọn</h2><button type="button" onClick={() => { setDetails(null); setSelectedId(''); }} className="rounded p-1 text-slate-500" aria-label="Đóng chi tiết"><X size={18} /></button></div>
            <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100"><ImageIcon className="text-slate-400" size={28} /><img src={`/api/bacsi/images/${encodeURIComponent(details.id)}/content`} alt={`Ảnh ${details.phase} ${details.imageType}`} className="absolute inset-0 h-full w-full bg-white object-contain" onError={(event) => event.currentTarget.classList.add('hidden')} /></div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs"><Meta label="Mã ảnh" value={details.id} /><Meta label="Ngày chụp" value={localDate(details.capturedAt)} /><Meta label="Vùng da" value={details.bodyArea || 'Chưa ghi'} /><Meta label="Loại / pha" value={`${details.imageType} · ${details.phase}`} /><Meta label="Kế hoạch" value={details.plan.name} /><Meta label="Người chụp" value={details.capturedBy?.fullName || 'Chưa ghi'} /><Meta label="Tệp" value={`${details.mimeType || 'Chưa có MIME'} · ${formatBytes(details.fileSizeBytes)}`} /><Meta label="Lưu trữ" value="Kho riêng tư · không hiển thị khóa" /></dl>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setLinkModal('visit')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Mở tóm tắt lần khám</button>{details.session && <button type="button" onClick={() => setLinkModal('session')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">Mở tóm tắt buổi điều trị</button>}{permissions.canHide && <button type="button" onClick={() => setConfirmAction(details.isHidden ? 'restore' : 'hide')} className="ml-auto rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-900">{details.isHidden ? 'Khôi phục ảnh' : 'Ẩn ảnh'}</button>}</div>
            <div className="border-t border-slate-200 pt-3"><h3 className="mb-2 font-semibold text-slate-900">Ghi chú và nhận xét</h3>{permissions.canNote ? <form onSubmit={saveNote} className="space-y-2"><textarea value={noteText} onChange={(event) => setNoteText(event.target.value)} maxLength={4000} rows={3} className="w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Nhận xét của bác sĩ…" /><button type="submit" disabled={savingNote || !noteText.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingNote ? 'Đang lưu…' : 'Lưu ghi chú'}</button></form> : <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">Tài khoản chưa có quyền ghi nhận xét chuyên môn.</p>}
              <ol className="mt-3 space-y-2">{(details.notes ?? []).map((note: any) => <li key={note.id} className="rounded-lg border border-slate-200 p-2 text-sm"><div className="flex justify-between gap-2 text-xs text-slate-500"><span>Phiên bản {note.version} · {note.author.fullName}</span><time>{localDate(note.createdAt)}</time></div><p className="mt-1 whitespace-pre-wrap">{note.text}</p></li>)}</ol>
            </div>
          </section>}

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">Nhật ký thao tác</h2>{permissions.canAudit && <div className="flex gap-2"><select value={auditAction} onChange={(event) => setAuditAction(event.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs"><option value="">Mọi hành động</option>{['IMAGE_VIEW', 'IMAGE_VIEW_DENIED', 'IMAGE_UPLOAD', 'IMAGE_UPLOAD_DENIED', 'IMAGE_NOTE_ADD', 'IMAGE_COMPARE', 'IMAGE_HIDE', 'IMAGE_RESTORE'].map((value) => <option key={value}>{value}</option>)}</select><button type="button" onClick={() => void loadAudit()} className="rounded border border-slate-300 px-2 py-1 text-xs">Tải nhật ký</button></div>}</div>
            {!permissions.canAudit ? <p className="text-sm text-slate-500">Bạn không có quyền xem nhật ký.</p> : <><div className="max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 text-slate-600"><tr><th className="p-2">Thời điểm</th><th className="p-2">Tài khoản</th><th className="p-2">Hành động</th><th className="p-2">Mã thực thể</th></tr></thead><tbody>{auditRows.map((row) => <tr key={row.id} className="border-t"><td className="p-2">{localDate(row.createdAt)}</td><td className="p-2">{row.username}</td><td className="p-2">{row.action}</td><td className="p-2">{row.entityId}</td></tr>)}</tbody></table></div>{auditRows.length > 0 && <button type="button" onClick={exportAuditCsv} className="text-xs font-semibold text-blue-700">Xuất nhật ký (CSV)</button>}{auditLoading && <span className="text-xs text-slate-500">Đang tải nhật ký…</span>}</>}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="mb-2 font-semibold text-slate-900">Quy trình và quyền hiện tại</h2><p className="text-xs text-slate-600">authenticate → hasPermission → inScope → entityCoherence → kiểm tra đồng thuận/tệp → lưu Neon + kho riêng tư → AuditLog</p><div className="mt-2 flex flex-wrap gap-2 text-xs">{Object.entries({ 'IMAGE_READ': canReadImages, 'IMAGE_WRITE': permissions.canUpload, 'EMR_WRITE': permissions.canNote, 'AUDIT_READ': permissions.canAudit }).map(([name, enabled]) => <span key={name} className={`rounded px-2 py-1 ${enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{name}: {enabled ? 'đã cấp' : 'chưa cấp'}</span>)}</div><p className="mt-2 text-xs text-slate-500">Lần gọi gần nhất: {lastTrace.length ? lastTrace.join(' → ') : 'Chưa có thao tác.'}</p></section>
        </div>
      </div>

      <p className="rounded-lg bg-slate-100 p-3 text-center text-xs text-slate-600">Hình ảnh chỉ dành cho nhân viên có quyền xem hồ sơ; không sử dụng cho truyền thông.</p>

      {showUpload && <Modal title="Thêm ảnh theo dõi" onClose={() => setShowUpload(false)}>
        {uploadOptionsLoading ? <div className="flex items-center gap-2 p-6 text-sm"><Loader2 className="animate-spin" /> Đang tải lượt khám và kế hoạch…</div> : <form onSubmit={submitUpload} className="space-y-3">
          <p className="text-sm text-slate-600">Bệnh nhân: <strong>{selectedPatient?.fullName} · {selectedPatient?.patientCode}</strong></p>
          {uploadError && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-800">{uploadError}</p>}
          <label className="block text-sm font-semibold">Tệp JPEG, PNG hoặc WebP (tối đa 10 MB)<input required name="file" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded border p-2 text-sm" /></label>
          <label className="block text-sm font-semibold">Lần khám<select required value={uploadForm.visitId} onChange={(event) => { const visit = uploadOptions.find((item) => item.id === event.target.value); setUploadForm((value) => ({ ...value, visitId: event.target.value, planId: visit?.plans?.[0]?.id ?? '', sessionId: '' })); }} className="mt-1 w-full rounded border p-2 text-sm">{uploadOptions.map((visit) => <option key={visit.id} value={visit.id}>{localDate(visit.visitDate)} · {visit.status}</option>)}</select></label>
          <label className="block text-sm font-semibold">Kế hoạch điều trị<select required value={uploadForm.planId} onChange={(event) => setUploadForm((value) => ({ ...value, planId: event.target.value, sessionId: '' }))} className="mt-1 w-full rounded border p-2 text-sm">{uploadOptions.find((visit) => visit.id === uploadForm.visitId)?.plans?.map((plan: any) => <option key={plan.id} value={plan.id}>{plan.name} · {plan.status}</option>)}</select></label>
          {selectedPlan && <p className={`rounded p-2 text-xs ${selectedPlan.hasImageConsent ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{selectedPlan.hasImageConsent ? 'Đã có đồng thuận lưu ảnh còn hiệu lực.' : 'Chưa có đồng thuận lưu ảnh lâm sàng. Tải ảnh sẽ bị chặn.'}</p>}
          <label className="block text-sm font-semibold">Buổi điều trị (không bắt buộc)<select value={uploadForm.sessionId} onChange={(event) => setUploadForm((value) => ({ ...value, sessionId: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm"><option value="">Không gắn buổi</option>{selectedPlan?.sessions?.map((session: any) => <option key={session.id} value={session.id}>Buổi {session.sessionNo}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Vùng da<input value={uploadForm.bodyArea} onChange={(event) => setUploadForm((value) => ({ ...value, bodyArea: event.target.value }))} maxLength={200} className="mt-1 w-full rounded border p-2 text-sm" /></label><label className="text-sm font-semibold">Thời điểm chụp<input required type="datetime-local" value={uploadForm.capturedAt} onChange={(event) => setUploadForm((value) => ({ ...value, capturedAt: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" /></label></div>
          <div className="grid grid-cols-2 gap-3"><label className="text-sm font-semibold">Pha<select value={uploadForm.phase} onChange={(event) => setUploadForm((value) => ({ ...value, phase: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm">{PHASES.map((phase) => <option key={phase}>{phase}</option>)}</select></label><label className="text-sm font-semibold">Loại ảnh<select value={uploadForm.imageType} onChange={(event) => setUploadForm((value) => ({ ...value, imageType: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm">{TYPES.map((type) => <option key={type}>{type}</option>)}</select></label></div>
          <label className="block text-sm font-semibold">Mô tả khi chụp<textarea value={uploadForm.description} onChange={(event) => setUploadForm((value) => ({ ...value, description: event.target.value }))} maxLength={1000} rows={3} className="mt-1 w-full rounded border p-2 text-sm" /></label>
          {!storageConfigured && <p className="rounded bg-amber-50 p-2 text-xs text-amber-900">Kho riêng tư chưa cấu hình; chưa thể tải ảnh lên.</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUpload(false)} className="rounded-lg border px-3 py-2 text-sm">Hủy</button><button type="submit" disabled={uploading || !storageConfigured || !selectedPlan?.hasImageConsent} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{uploading ? 'Đang tải…' : 'Tải ảnh lên'}</button></div>
        </form>}
      </Modal>}

      {confirmAction && <Modal title={confirmAction === 'hide' ? 'Ẩn ảnh theo dõi' : 'Khôi phục ảnh'} onClose={() => setConfirmAction(null)}><div className="space-y-3"><p className="text-sm text-slate-700">{confirmAction === 'hide' ? 'Ảnh sẽ bị ẩn khỏi timeline mặc định. Tệp gốc và lịch sử vẫn được giữ.' : 'Ảnh sẽ hiển thị lại trong timeline.'}</p>{confirmAction === 'hide' && <label className="block text-sm font-semibold">Lý do ẩn<textarea required value={hideReason} onChange={(event) => setHideReason(event.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded border p-2" /></label>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setConfirmAction(null)} className="rounded-lg border px-3 py-2 text-sm">Hủy</button><button type="button" disabled={confirmAction === 'hide' && !hideReason.trim()} onClick={() => void applyHideRestore()} className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white">Xác nhận</button></div></div></Modal>}

      {linkModal && details && <Modal title={linkModal === 'visit' ? 'Tóm tắt lần khám' : 'Tóm tắt buổi điều trị'} onClose={() => setLinkModal(null)}><dl className="grid grid-cols-2 gap-3 text-sm">{linkModal === 'visit' ? <><Meta label="Thời điểm" value={localDate(details.visit.visitDate)} /><Meta label="Trạng thái" value={details.visit.status} /><Meta label="Phòng" value={details.visit.roomName || 'Chưa ghi nhận'} /><Meta label="Bác sĩ phụ trách" value={details.visit.employeeName || 'Chưa ghi nhận'} /></> : <><Meta label="Buổi" value={`Buổi ${details.session.sessionNo}`} /><Meta label="Trạng thái" value={details.session.status} /><Meta label="Vùng điều trị" value={details.session.treatmentArea || 'Chưa ghi nhận'} /><Meta label="Người thực hiện" value={details.session.performedByName || 'Chưa ghi nhận'} /></>}</dl></Modal>}
      {notice && <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-lg"><div className="flex items-start gap-2"><ShieldCheck size={17} className="mt-0.5 text-blue-700" /><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Đóng thông báo"><X size={15} /></button></div></div>}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words font-medium text-slate-800">{value}</dd></div>;
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-xl bg-white p-5 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button type="button" onClick={onClose} aria-label="Đóng hộp thoại" className="rounded p-1 text-slate-500"><X size={18} /></button></div>{children}</div></div>;
}
