'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, ExternalLink, FileText, FlaskConical, RefreshCw, Save, Search, ShieldAlert, Stethoscope } from 'lucide-react';
import { completeAssignedVisit, saveExaminationMedicalRecord, startAssignedVisit } from '../actions';
import { ExaminationVisitPicker, type ExaminationVisitOption } from './ExaminationVisitPicker';
import { saveDoctorClinicalOrder, saveDoctorClinicalResult } from '../clinical-orders/actions';

type RecordFields = { preliminaryDiagnosis: string; finalDiagnosis: string; notes: string };
type ExaminationVisit = {
  id: string;
  patientId: string;
  visitDate: string;
  status: string;
  patient: { id: string; patientCode: string; fullName: string; dateOfBirth: string | null; phone: string | null };
  employee: { fullName: string } | null;
  room: { name: string; department: { name: string } } | null;
  medicalRecord: ({ id: string; visitId: string } & RecordFields) | null;
  orders?: Array<{
    id: string;
    type: string;
    status: string;
    orderedAt: string;
    orderedBy: { fullName: string } | null;
    service: { code: string; name: string } | null;
    labResults: Array<{ id: string; testName: string; result: string; unit: string | null; finding?: string | null; professionalConclusion?: string | null; hasFile?: boolean; fileMimeType?: string | null; fileName?: string | null }>;
    imagingResults: Array<{ id: string; imagingType: string; conclusion: string; finding?: string | null; professionalConclusion?: string | null; hasFile?: boolean; hasImage?: boolean; fileMimeType?: string | null; fileName?: string | null }>;
  }>;
  prescriptions?: Array<{ id: string; status: string; items: Array<{ id: string; dosage: string; medicine: { name: string; unit: string } }> }>;
};

type Props = {
  visit: ExaminationVisit;
  visitOptions: ExaminationVisitOption[];
  selectedVisitId: string;
  selectedDate: string;
  canWrite: boolean;
  canStartVisit: boolean;
  canSupplementNotes?: boolean;
  writeBlockReason?: string;
  canReadClinicalOrders: boolean;
  canManageClinicalOrders: boolean;
  clinicalImageStorageConfigured: boolean;
  canReadPrescriptions: boolean;
};

const tabs = [
  ['record', 'Bệnh án'],
  ['orders', 'Chỉ định cận lâm sàng'],
  ['results', 'Kết quả'],
  ['prescriptions', 'Đơn thuốc'],
] as const;

const VISIT_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Chờ khám', CHECKED_IN: 'Đã tiếp nhận', IN_PROGRESS: 'Đang khám', EXAMINING: 'Đang khám',
  WAITING_RESULT: 'Chờ kết quả', RESULT_READY: 'Đã có kết quả', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến',
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function orderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    WAITING: 'Đang chờ', WAITING_RESULT: 'Đang chờ', CREATED: 'Đang chờ', AWAITING_PAYMENT: 'Đang chờ',
    IN_PROGRESS: 'Đang thực hiện', READY: 'Đang thực hiện',
    COMPLETED: 'Đã có kết quả', RESULT_READY: 'Đã có kết quả', CANCELLED: 'Đã hủy',
  };
  return labels[status] ?? status.replaceAll('_', ' ');
}

function age(value: string | null) {
  if (!value) return 'Chưa có ngày sinh';
  const born = new Date(value);
  if (Number.isNaN(born.getTime())) return 'Chưa có ngày sinh';
  const today = new Date();
  let years = today.getFullYear() - born.getFullYear();
  if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) years -= 1;
  return `${years} tuổi`;
}

function snapshot(record: ExaminationVisit['medicalRecord']) {
  return record ? {
    preliminaryDiagnosis: record.preliminaryDiagnosis ?? null,
    finalDiagnosis: record.finalDiagnosis ?? null,
    notes: record.notes ?? null,
  } : null;
}

export function DoctorExaminationPanel({ visit, visitOptions, selectedVisitId, selectedDate, canWrite, canStartVisit, canSupplementNotes = false, writeBlockReason, canReadClinicalOrders, canManageClinicalOrders, clinicalImageStorageConfigured, canReadPrescriptions }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>('record');
  const initialDraft: RecordFields = {
    preliminaryDiagnosis: visit.medicalRecord?.preliminaryDiagnosis ?? '',
    finalDiagnosis: visit.medicalRecord?.finalDiagnosis ?? '',
    notes: visit.medicalRecord?.notes ?? '',
  };
  const [draftState, setDraftState] = useState<{ visitId: string; value: RecordFields }>(() => ({ visitId: visit.id, value: initialDraft }));
  const [savedRecordState, setSavedRecordState] = useState<{ visitId: string; value: ExaminationVisit['medicalRecord'] }>(() => ({ visitId: visit.id, value: visit.medicalRecord }));
  const draft = draftState.visitId === visit.id ? draftState.value : initialDraft;
  const savedRecord = savedRecordState.visitId === visit.id ? savedRecordState.value : visit.medicalRecord;
  const setDraft = (value: RecordFields) => setDraftState({ visitId: visit.id, value });
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [visitStatus, setVisitStatus] = useState(visit.status);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const orderStatuses = useMemo(() => [...new Set((visit.orders ?? []).map((order) => order.status))].sort(), [visit.orders]);

  const dirty = draft.preliminaryDiagnosis !== (savedRecord?.preliminaryDiagnosis ?? '') ||
    draft.finalDiagnosis !== (savedRecord?.finalDiagnosis ?? '') ||
    draft.notes !== (savedRecord?.notes ?? '');
  const notesDirty = draft.notes !== (savedRecord?.notes ?? '');
  const locallyStarted = canStartVisit && ['IN_PROGRESS', 'EXAMINING'].includes(visitStatus);
  const effectiveCanWrite = canWrite || locallyStarted;
  const canEditNotes = effectiveCanWrite || canSupplementNotes;
  const canSave = effectiveCanWrite ? dirty : canSupplementNotes && notesDirty;
  const hasSavedPrescription = Boolean(visit.prescriptions?.some((prescription) => prescription.items.length > 0));
  const canCompleteVisit = effectiveCanWrite && canReadPrescriptions && hasSavedPrescription && ['IN_PROGRESS', 'EXAMINING'].includes(visitStatus);
  const filteredOrders = useMemo(() => {
    const orders = visit.orders ?? [];
    const value = query.trim().toLocaleLowerCase('vi-VN');
    return orders.filter((order) => (!orderStatus || order.status === orderStatus) && (!value || [order.id, order.type, order.status, order.service?.code, order.service?.name,
      ...order.labResults.flatMap((result) => [result.testName, result.result, result.finding, result.professionalConclusion]),
      ...order.imagingResults.flatMap((result) => [result.imagingType, result.conclusion, result.finding, result.professionalConclusion]),
    ].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN').includes(value)));
  }, [visit.orders, query, orderStatus]);

  async function refresh() {
    setRefreshing(true);
    setMessage(null);
    window.location.reload();
  }

  async function completeVisit() {
    if (!canCompleteVisit || completing) return;
    if (!window.confirm('Xác nhận hoàn tất lượt khám? Visit sẽ chuyển sang Đã hoàn tất và khóa chỉnh sửa bệnh án.')) return;
    setCompleting(true);
    setMessage(null);
    try {
      const result = await completeAssignedVisit(visit.id);
      if (!result.success) {
        setMessage({ kind: 'error', text: result.error });
        return;
      }
      router.push(`/bacsi/queue?date=${encodeURIComponent(new Date(visit.visitDate).toISOString().slice(0, 10))}`);
      router.refresh();
    } catch {
      setMessage({ kind: 'error', text: 'Không thể hoàn tất Visit. Hãy tải lại trang và thử lại.' });
    } finally {
      setCompleting(false);
    }
  }

  async function startVisit() {
    if (!canStartVisit || starting) return;
    setStarting(true);
    setMessage(null);
    try {
      const result = await startAssignedVisit(visit.id);
      if (!result.success) {
        setMessage({ kind: 'error', text: result.error });
        return;
      }
      setVisitStatus('IN_PROGRESS');
      setMessage({ kind: 'success', text: 'Đã bắt đầu khám. Bệnh án của lượt khám hiện có thể cập nhật.' });
    } catch {
      setMessage({ kind: 'error', text: 'Không thể bắt đầu khám. Hãy tải lại trang và thử lại.' });
    } finally {
      setStarting(false);
    }
  }

  async function save() {
    if (!canEditNotes || !canSave || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveExaminationMedicalRecord(visit.id, draft, snapshot(savedRecord));
      if (!result.success) {
        setMessage({ kind: 'error', text: result.error || 'Không thể lưu bệnh án. Hãy tải lại và thử lại.' });
        return;
      }
      const record = result.data as ExaminationVisit['medicalRecord'];
      if (!record) {
        setMessage({ kind: 'error', text: 'Không nhận được bệnh án sau khi lưu. Hãy làm mới để xác minh dữ liệu.' });
        return;
      }
      setSavedRecordState({ visitId: visit.id, value: record });
      setDraft({
        preliminaryDiagnosis: record.preliminaryDiagnosis ?? '',
        finalDiagnosis: record.finalDiagnosis ?? '',
        notes: record.notes ?? '',
      });
      setMessage({ kind: 'success', text: 'Đã lưu bệnh án cho lượt khám được phân công.' });
    } catch {
      setMessage({ kind: 'error', text: 'Không thể lưu bệnh án. Hãy tải lại và thử lại.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-slate-800">
      <section className="rounded-2xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5" aria-label="Khám bệnh và thông tin lượt khám">
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[minmax(260px,0.8fr)_minmax(380px,1.2fr)]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Khu vực bác sĩ</span>
              <div className="flex gap-2">
                <Link href={`/bacsi/queue?date=${encodeURIComponent(selectedDate)}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={14} /> Hàng đợi</Link>
                <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Làm mới</button>
              </div>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Khám bệnh &amp; Chỉ định</h1>
            <p className="mt-1 text-sm text-slate-500">Ghi nhận bệnh án trong phạm vi lượt khám được phân công.</p>
          </div>
          <ExaminationVisitPicker visits={visitOptions} selectedVisitId={selectedVisitId} date={selectedDate} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thông tin lượt khám">
          <div><p className="text-xs text-slate-500">Mã bệnh nhân · Tuổi · Điện thoại</p><p className="mt-1 text-sm font-semibold text-slate-800">{visit.patient.patientCode} · {age(visit.patient.dateOfBirth)}{visit.patient.phone ? ` · ${visit.patient.phone}` : ''}</p></div>
          <div><p className="text-xs text-slate-500">Mã lượt khám</p><p className="mt-1 break-all text-sm font-semibold text-slate-800">{visit.id}</p></div>
          <div><p className="text-xs text-slate-500">Thời điểm lượt khám</p><p className="mt-1 text-sm font-semibold text-slate-800">{dateTime(visit.visitDate)}</p></div>
          <div><p className="text-xs text-slate-500">Trạng thái · Phòng / Bác sĩ</p><p className="mt-1 text-sm font-semibold text-slate-800">{VISIT_STATUS_LABELS[visitStatus] ?? visitStatus} · {visit.room ? `${visit.room.name} · ${visit.room.department.name}` : 'Chưa có phòng'}{visit.employee?.fullName ? ` · ${visit.employee.fullName}` : ''}</p></div>
        </div>
      </section>

      {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${message.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'}`}>{message.text}</p>}

      <nav className="flex gap-6 overflow-x-auto border-b border-[#e1e9f2]" aria-label="Nội dung khám bệnh">
        {tabs.map(([key, label]) => <button key={key} type="button" onClick={() => setActiveTab(key)} aria-current={activeTab === key ? 'page' : undefined} className={`shrink-0 border-b-2 px-1 py-3 text-sm ${activeTab === key ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}
      </nav>

      {activeTab === 'record' && <section className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
        <div className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#20334b]">Ghi nhận khám bệnh</h2>
            {!savedRecord && <p className="mt-1 text-sm text-slate-500">
              {effectiveCanWrite
                ? 'Lượt khám chưa có bệnh án. Bệnh án sẽ được tạo khi bạn lưu nội dung khám lần đầu.'
                : 'Lượt khám chưa có bệnh án.'}
            </p>}
          </div>
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Chẩn đoán sơ bộ
              <input value={draft.preliminaryDiagnosis} onChange={(event) => setDraft({ ...draft, preliminaryDiagnosis: event.target.value })} readOnly={!effectiveCanWrite} maxLength={10000} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder={effectiveCanWrite ? 'Nhập theo đánh giá chuyên môn' : 'Chưa ghi nhận'} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Chẩn đoán xác định
              <input value={draft.finalDiagnosis} onChange={(event) => setDraft({ ...draft, finalDiagnosis: event.target.value })} readOnly={!effectiveCanWrite} maxLength={10000} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder={effectiveCanWrite ? 'Nhập khi đã có kết luận chuyên môn' : 'Chưa ghi nhận'} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Ghi chú khám bệnh
              <textarea rows={8} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} readOnly={!canEditNotes} maxLength={10000} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 font-normal leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder={canEditNotes ? 'Ghi nội dung khám theo quy trình đã được phê duyệt' : 'Chưa ghi nhận'} />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {!canEditNotes && <p className="text-xs text-slate-500">{writeBlockReason ?? 'Lượt khám đang ở chế độ chỉ đọc.'}</p>}
            {canStartVisit && !locallyStarted && <button type="button" onClick={() => void startVisit()} disabled={starting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#246dce] px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"><Stethoscope size={16} /> {starting ? 'Đang bắt đầu khám…' : 'Bắt đầu khám'}</button>}
            {canEditNotes && <button type="button" onClick={() => void save()} disabled={!canSave || saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#246dce] px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} /> {saving ? 'Đang lưu…' : canSupplementNotes && !effectiveCanWrite ? 'Lưu ghi chú bổ sung' : 'Lưu bệnh án'}</button>}
          </div>
        </div>
        <aside className="space-y-3">
          <div className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><h2 className="font-bold text-[#20334b]">Phạm vi dữ liệu</h2><p className="mt-2 text-sm leading-6 text-slate-600">Chỉ hiển thị dữ liệu gắn với lượt khám đang được phân công cho tài khoản hiện tại. Không tự thay đổi trạng thái lượt khám.</p><div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><ShieldAlert size={15} className="mr-1 inline" /> Dị ứng và tiền sử bệnh nhân chưa được hiển thị vì chính sách truy cập chưa được phê duyệt.</div></div>
          <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5" aria-labelledby="visit-orders-title">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 id="visit-orders-title" className="font-bold text-[#20334b]">Chỉ định &amp; kết quả</h2>
                <p className="mt-1 text-xs text-slate-500">Dữ liệu đã lưu trong Visit này.</p>
              </div>
              <button type="button" onClick={() => setActiveTab('orders')} className="shrink-0 text-sm font-semibold text-blue-700 hover:underline" aria-label="Mở danh sách chỉ định">
                Xem tất cả
              </button>
            </div>
            {!canReadClinicalOrders ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Tài khoản hiện tại chưa có quyền đọc chỉ định và kết quả.</p>
            ) : (visit.orders ?? []).length === 0 ? (
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">Chưa có chỉ định trong lượt khám này.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {(visit.orders ?? []).slice(0, 4).map((order) => (
                  <li key={order.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{order.service?.name ?? order.type}</p>
                        <p className="mt-1 text-xs text-slate-500">{dateTime(order.orderedAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800">{orderStatusLabel(order.status)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Bác sĩ phụ trách ghi nhận chỉ định và cập nhật kết quả trực tiếp trong Visit.</p>
          </section>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1"><Link href={`/bacsi/emr?patientId=${encodeURIComponent(visit.patientId)}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><FileText size={16} /> Hồ sơ bệnh nhân <ExternalLink size={14} /></Link>{canReadPrescriptions ? <Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><ClipboardList size={16} /> Kê đơn <ExternalLink size={14} /></Link> : <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"><ClipboardList size={16} /> Kê đơn chưa được cấp quyền</span>}</div>
        </aside>
      </section>}

      {activeTab === 'orders' && <ClinicalOrders orders={filteredOrders} query={query} onQuery={setQuery} status={orderStatus} onStatus={setOrderStatus} statuses={orderStatuses} canRead={canReadClinicalOrders} canWrite={canManageClinicalOrders && (effectiveCanWrite || locallyStarted)} visitId={visit.id} storageConfigured={clinicalImageStorageConfigured} />}
      {activeTab === 'results' && <ClinicalResultsEditor orders={filteredOrders} query={query} onQuery={setQuery} status={orderStatus} onStatus={setOrderStatus} statuses={orderStatuses} canRead={canReadClinicalOrders} canWrite={canManageClinicalOrders && effectiveCanWrite} visitId={visit.id} storageConfigured={clinicalImageStorageConfigured} />}
      {activeTab === 'prescriptions' && <section className="rounded-xl border border-[#e1e9f2] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#20334b]">Đơn thuốc của lượt khám</h2>
        {!canReadPrescriptions ? <p className="mt-3 text-sm text-slate-600">Tài khoản hiện tại không có quyền xem đơn thuốc.</p> : (visit.prescriptions ?? []).length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">Chưa có đơn thuốc được lưu cho lượt khám này.</p> : <div className="mt-4 space-y-3">{visit.prescriptions?.map((prescription) => <article key={prescription.id} className="rounded-lg border border-slate-200 p-4"><p className="font-semibold">{prescription.id} · {prescription.status}</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{prescription.items.map((item) => <li key={item.id}>{item.medicine.name} ({item.medicine.unit}) · {item.dosage}</li>)}</ul></article>)}</div>}
        {canReadPrescriptions && <Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visit.id)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">Mở trang Kê đơn <ExternalLink size={14} /></Link>}
      </section>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e9f2] pt-4 text-xs text-slate-500"><span>Visit và bệnh án được giới hạn theo nhân viên được phân công.</span><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => void completeVisit()} disabled={!canCompleteVisit || completing} title={!hasSavedPrescription ? "Cần lưu đơn thuốc có ít nhất một thuốc." : !effectiveCanWrite ? "Chỉ bác sĩ được phân công có quyền ghi mới được hoàn tất Visit." : undefined} className="inline-flex h-10 items-center rounded-lg border border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500">{completing ? "Đang hoàn tất…" : "Hoàn tất lượt khám"}</button><Link href="/bacsi/queue" className="font-semibold text-blue-700 hover:text-blue-900">Quay lại hàng đợi khám</Link></div></footer>
    </main>
  );
}

type Order = NonNullable<ExaminationVisit['orders']>[number];

function OrderSearch({ query, onQuery }: { query: string; onQuery: (value: string) => void }) {
  return <label className="relative block"><span className="sr-only">Tìm mã chỉ định, dịch vụ hoặc kết quả</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => onQuery(event.target.value)} maxLength={100} placeholder="Tìm mã chỉ định, dịch vụ hoặc kết quả…" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>;
}

function ClinicalOrders({ orders, query, onQuery, status, onStatus, statuses, canRead, canWrite, visitId, storageConfigured }: {
  orders: Order[]; query: string; onQuery: (value: string) => void; status: string; onStatus: (value: string) => void;
  statuses: string[]; canRead: boolean; canWrite: boolean; visitId: string; storageConfigured: boolean;
}) {
  const router = useRouter();
  const [orderForm, setOrderForm] = useState<{ orderId?: string; category: 'LAB' | 'IMAGING'; title: string } | null>(null);
  const [resultForm, setResultForm] = useState<{ orderId: string; resultId?: string; category: 'LAB' | 'IMAGING'; label: string; result: string; unit: string; finding: string; professionalConclusion: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const [feedback, setFeedback] = useState('');

  const saveOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderForm || busy) return;
    setBusy(true); setFeedback('');
    const saved = await saveDoctorClinicalOrder({ visitId, ...orderForm });
    setBusy(false);
    if (!saved.success) { setFeedback(saved.error); return; }
    setOrderForm(null); router.refresh();
  };

  const saveResult = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!resultForm || busy) return;
    setBusy(true); setFeedback('');
    const saved = await saveDoctorClinicalResult(resultForm);
    setBusy(false);
    if (!saved.success) { setFeedback(saved.error); return; }
    setResultForm(null); router.refresh();
  };

  const uploadResultImage = async (resultId: string, file?: File) => {
    if (!file) return;
    setUploadingId(resultId); setFeedback('');
    try {
      const form = new FormData(); form.set('file', file);
      const response = await fetch(`/api/bacsi/clinical-results/${encodeURIComponent(resultId)}/image`, { method: 'POST', body: form, credentials: 'same-origin' });
      const body = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !body.success) { setFeedback(body.error ?? 'Không tải được ảnh kết quả.'); return; }
      router.refresh();
    } catch { setFeedback('Không tải được ảnh kết quả. Hãy thử lại.'); }
    finally { setUploadingId(''); }
  };

  const categoryOf = (order: Order): 'LAB' | 'IMAGING' => order.type.startsWith('IMAGING:') ? 'IMAGING' : 'LAB';
  const titleOf = (order: Order) => order.type.includes(':') ? order.type.slice(order.type.indexOf(':') + 1) : order.service?.name ?? order.type;

  return <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#20334b]">Chỉ định cận lâm sàng</h2><p className="mt-1 text-sm text-slate-500">Bác sĩ tạo chỉ định và ghi nhận kết quả trực tiếp trong Visit.</p></div>
      {canWrite && <button type="button" onClick={() => { setFeedback(''); setOrderForm({ category: 'LAB', title: '' }); }} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">+ Thêm chỉ định</button>}
    </div>
    {feedback && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{feedback}</p>}
    {orderForm && <form onSubmit={(event) => void saveOrder(event)} className="mt-4 grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
      <label className="text-sm font-medium text-slate-700">Nhóm chỉ định<select value={orderForm.category} onChange={(event) => setOrderForm({ ...orderForm, category: event.target.value as 'LAB' | 'IMAGING' })} disabled={Boolean(orderForm.orderId)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"><option value="LAB">Xét nghiệm</option><option value="IMAGING">Chẩn đoán hình ảnh</option></select></label>
      <label className="text-sm font-medium text-slate-700">Tên chỉ định<input required maxLength={180} value={orderForm.title} onChange={(event) => setOrderForm({ ...orderForm, title: event.target.value })} placeholder="Nhập dịch vụ/chỉ định" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <div className="flex gap-2"><button type="button" onClick={() => setOrderForm(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Hủy</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Đang lưu…' : orderForm.orderId ? 'Lưu chỉ định' : 'Tạo chỉ định'}</button></div>
    </form>}
    {resultForm && <form onSubmit={(event) => void saveResult(event)} className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <h3 className="font-semibold text-slate-900">{resultForm.resultId ? 'Sửa kết quả' : 'Ghi kết quả'} · {resultForm.category === 'LAB' ? 'Xét nghiệm' : 'Hình ảnh'}</h3>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <label className="text-sm font-medium text-slate-700">{resultForm.category === 'LAB' ? 'Tên xét nghiệm' : 'Loại hình ảnh'}<input required maxLength={180} value={resultForm.label} onChange={(event) => setResultForm({ ...resultForm, label: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
        {resultForm.category === 'LAB' && <label className="text-sm font-medium text-slate-700">Đơn vị<input maxLength={80} value={resultForm.unit} onChange={(event) => setResultForm({ ...resultForm, unit: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>}
      </div>
      <label className="block text-sm font-medium text-slate-700">{resultForm.category === 'LAB' ? 'Giá trị đo' : 'Kết quả máy đo'}<textarea rows={2} maxLength={10000} value={resultForm.result} onChange={(event) => setResultForm({ ...resultForm, result: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Phát hiện hoặc nhận xét<textarea rows={3} maxLength={10000} value={resultForm.finding} onChange={(event) => setResultForm({ ...resultForm, finding: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Kết luận chuyên môn<textarea rows={3} maxLength={10000} value={resultForm.professionalConclusion} onChange={(event) => setResultForm({ ...resultForm, professionalConclusion: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setResultForm(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Hủy</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Đang lưu…' : 'Lưu kết quả'}</button></div>
    </form>}
    <div className="mt-4"><OrderSearch query={query} onQuery={onQuery} /></div>
    <div className="mt-2"><label className="sr-only">Lọc theo trạng thái chỉ định</label><select value={status} onChange={(event) => onStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-auto"><option value="">Tất cả trạng thái</option>{statuses.map((value) => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}</select></div>
    {!canRead ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Không có quyền đọc chỉ định cận lâm sàng của Visit này.</p> : orders.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">Chưa có chỉ định trong Visit này.</p> : <div className="mt-4 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{titleOf(order)}</h3><p className="mt-1 text-xs text-slate-500">{categoryOf(order) === 'LAB' ? 'Xét nghiệm' : 'Chẩn đoán hình ảnh'} · {order.id} · {dateTime(order.orderedAt)} · Bác sĩ: {order.orderedBy?.fullName ?? '—'}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{orderStatusLabel(order.status)}</span></div>
      {canWrite && <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => setOrderForm({ orderId: order.id, category: categoryOf(order), title: titleOf(order) })} className="text-sm font-semibold text-blue-700 hover:underline">Sửa chỉ định</button><button type="button" onClick={() => { const category = categoryOf(order); const existing = category === 'LAB' ? order.labResults[0] : order.imagingResults[0]; setResultForm({ orderId: order.id, ...(existing ? { resultId: existing.id } : {}), category, label: category === 'LAB' ? (order.labResults[0]?.testName ?? titleOf(order)) : (order.imagingResults[0]?.imagingType ?? titleOf(order)), result: category === 'LAB' ? (order.labResults[0]?.result ?? '') : '', unit: category === 'LAB' ? (order.labResults[0]?.unit ?? '') : '', finding: existing?.finding ?? '', professionalConclusion: existing?.professionalConclusion ?? (category === 'IMAGING' ? order.imagingResults[0]?.conclusion ?? '' : '') }); }} className="text-sm font-semibold text-blue-700 hover:underline">Nhập kết quả</button></div>}
      <div className="mt-3 space-y-2">
        {order.labResults.map((result) => <div key={result.id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between gap-2"><div><p><strong>{result.testName}:</strong> {result.result || 'Chưa nhập giá trị đo'}{result.unit ? ` ${result.unit}` : ''}</p>{result.finding && <p className="mt-1 whitespace-pre-wrap text-slate-600">Phát hiện: {result.finding}</p>}{result.professionalConclusion && <p className="mt-1 whitespace-pre-wrap text-slate-700">Kết luận chuyên môn: {result.professionalConclusion}</p>}</div>{canWrite && <button type="button" onClick={() => setResultForm({ orderId: order.id, resultId: result.id, category: 'LAB', label: result.testName, result: result.result, unit: result.unit ?? '', finding: result.finding ?? '', professionalConclusion: result.professionalConclusion ?? '' })} className="shrink-0 text-xs font-semibold text-blue-700">Nhập / sửa kết quả</button>}</div>{result.hasFile && <ResultFilePreview resultId={result.id} fileName={result.fileName} mimeType={result.fileMimeType} title={result.testName} />}{canWrite && <ResultFileUpload resultId={result.id} fileName={result.fileName} disabled={!storageConfigured} onUpload={uploadResultImage} uploading={uploadingId === result.id} />}</div>)}
        {order.imagingResults.map((result) => <div key={result.id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><p><strong>{result.imagingType}:</strong> {result.finding || 'Chưa nhập phát hiện'} </p>{result.professionalConclusion && <p className="mt-1 whitespace-pre-wrap text-slate-700">Kết luận chuyên môn: {result.professionalConclusion}</p>}</div>{canWrite && <button type="button" onClick={() => setResultForm({ orderId: order.id, resultId: result.id, category: 'IMAGING', label: result.imagingType, result: '', unit: '', finding: result.finding ?? '', professionalConclusion: result.professionalConclusion ?? result.conclusion ?? '' })} className="shrink-0 text-xs font-semibold text-blue-700">Nhập / sửa kết quả</button>}</div>
          {(result.hasFile || result.hasImage) && <ResultFilePreview resultId={result.id} fileName={result.fileName} mimeType={result.fileMimeType} title={result.imagingType} />}
          {canWrite && <ResultFileUpload resultId={result.id} fileName={result.fileName} disabled={!storageConfigured} onUpload={uploadResultImage} uploading={uploadingId === result.id} />}
        </div>)}
      </div>
    </article>)}</div>}
    {canWrite && !storageConfigured && <p className="mt-3 text-xs text-amber-800">Kho ảnh riêng tư chưa được cấu hình; bác sĩ vẫn có thể tạo chỉ định và ghi kết quả chữ.</p>}
  </section>;
}

function ResultFilePreview({ resultId, fileName, mimeType, title }: { resultId: string; fileName?: string | null; mimeType?: string | null; title: string }) {
  const href = `/api/bacsi/clinical-results/${encodeURIComponent(resultId)}/image`;
  return <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
    <p className="mb-2 text-xs font-semibold text-slate-600">Tệp kết quả: {fileName || 'Tệp đính kèm'}</p>
    {mimeType === 'application/pdf' ? <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline">Mở file kết quả PDF</a> : <img src={href} alt={`Ảnh kết quả ${title}`} className="max-h-80 rounded border border-slate-200 object-contain" />}
  </div>;
}

function ResultFileUpload({ resultId, fileName, disabled, onUpload, uploading }: { resultId: string; fileName?: string | null; disabled: boolean; onUpload: (resultId: string, file?: File) => Promise<void>; uploading: boolean }) {
  return <label className="mt-3 inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">{uploading ? 'Đang tải tệp…' : fileName ? 'Thay tệp kết quả' : 'Tải ảnh / file kết quả'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" disabled={disabled || uploading} onChange={(event) => { void onUpload(resultId, event.target.files?.[0]); event.currentTarget.value = ''; }} className="sr-only" /></label>;
}

function ClinicalResultsEditor({ orders, query, onQuery, status, onStatus, statuses, canRead, canWrite, visitId, storageConfigured }: { orders: Order[]; query: string; onQuery: (value: string) => void; status: string; onStatus: (value: string) => void; statuses: string[]; canRead: boolean; canWrite: boolean; visitId: string; storageConfigured: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<{ orderId: string; resultId?: string; category: 'LAB' | 'IMAGING'; label: string; result: string; unit: string; finding: string; professionalConclusion: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadingId, setUploadingId] = useState('');
  const [feedback, setFeedback] = useState('');
  const rows = orders.flatMap((order) => [
    ...order.labResults.map((result) => ({ id: result.id, order, category: 'LAB' as const, label: result.testName, value: result.result, unit: result.unit ?? '', finding: result.finding ?? '', conclusion: result.professionalConclusion ?? '', hasFile: result.hasFile ?? false, fileMimeType: result.fileMimeType, fileName: result.fileName })),
    ...order.imagingResults.map((result) => ({ id: result.id, order, category: 'IMAGING' as const, label: result.imagingType, value: '', unit: '', finding: result.finding ?? '', conclusion: result.professionalConclusion ?? result.conclusion ?? '', hasFile: result.hasFile ?? false, fileMimeType: result.fileMimeType, fileName: result.fileName })),
  ]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || busy) return;
    setBusy(true); setFeedback('');
    const result = await saveDoctorClinicalResult({ orderId: form.orderId, ...(form.resultId ? { resultId: form.resultId } : {}), label: form.label, result: form.result, unit: form.unit, finding: form.finding, professionalConclusion: form.professionalConclusion });
    setBusy(false);
    if (!result.success) { setFeedback(result.error); return; }
    setForm(null); router.refresh();
  };

  const upload = async (resultId: string, file?: File) => {
    if (!file) return;
    setUploadingId(resultId); setFeedback('');
    try {
      const body = new FormData(); body.set('file', file);
      const response = await fetch(`/api/bacsi/clinical-results/${encodeURIComponent(resultId)}/image`, { method: 'POST', body, credentials: 'same-origin' });
      const result = await response.json() as { success?: boolean; error?: string };
      if (!response.ok || !result.success) { setFeedback(result.error ?? 'Không tải được tệp kết quả.'); return; }
      router.refresh();
    } catch { setFeedback('Không tải được tệp kết quả. Hãy thử lại.'); }
    finally { setUploadingId(''); }
  };

  return <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5">
    <div><h2 className="text-lg font-bold text-[#20334b]">Kết quả cận lâm sàng</h2><p className="mt-1 text-sm text-slate-500">Nhập kết quả máy đo, nhận xét, kết luận chuyên môn và đính kèm ảnh hoặc file cho từng chỉ định.</p></div>
    <div className="mt-4"><OrderSearch query={query} onQuery={onQuery} /></div>
    <div className="mt-2"><label className="sr-only">Lọc theo trạng thái chỉ định</label><select value={status} onChange={(event) => onStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-auto"><option value="">Tất cả trạng thái</option>{statuses.map((value) => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}</select></div>
    {feedback && <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{feedback}</p>}
    {!canRead ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Không có quyền đọc kết quả cận lâm sàng của Visit này.</p> : orders.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">Chưa có chỉ định phù hợp.</p> : <div className="mt-4 space-y-4">{orders.map((order) => <article key={order.id} className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{order.type.includes(':') ? order.type.slice(order.type.indexOf(':') + 1) : order.service?.name ?? order.type}</h3><p className="mt-1 text-xs text-slate-500">{dateTime(order.orderedAt)} · Bác sĩ chỉ định: {order.orderedBy?.fullName ?? '—'}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-800'}`}>{orderStatusLabel(order.status)}</span></div>
      <div className="mt-3 space-y-3">{rows.filter((row) => row.order.id === order.id).map((row) => <div key={row.id} className="rounded-lg bg-slate-50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-800">{row.category === 'LAB' ? `Xét nghiệm · ${row.label}` : `Hình ảnh · ${row.label}`}</p>{row.category === 'LAB' && <p className="mt-1 text-sm text-slate-700">Giá trị đo: {row.value || 'Chưa có'}{row.unit ? ` ${row.unit}` : ''}</p>}{row.finding && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">Phát hiện / nhận xét: {row.finding}</p>}{row.conclusion && <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">Kết luận chuyên môn: {row.conclusion}</p>}</div>{canWrite && <button type="button" onClick={() => setForm({ orderId: order.id, resultId: row.id, category: row.category, label: row.label, result: row.value, unit: row.unit, finding: row.finding, professionalConclusion: row.conclusion })} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700">Nhập / sửa kết quả</button>}</div>
        {row.hasFile && <ResultFilePreview resultId={row.id} fileName={row.fileName} mimeType={row.fileMimeType} title={row.label} />}
        {canWrite && <ResultFileUpload resultId={row.id} fileName={row.fileName} disabled={!storageConfigured} onUpload={upload} uploading={uploadingId === row.id} />}
      </div>)}</div>
      {canWrite && order.labResults.length + order.imagingResults.length === 0 && <button type="button" onClick={() => { const category = order.type.startsWith('IMAGING:') ? 'IMAGING' : 'LAB'; setForm({ orderId: order.id, category, label: order.type.includes(':') ? order.type.slice(order.type.indexOf(':') + 1) : order.service?.name ?? '', result: '', unit: '', finding: '', professionalConclusion: '' }); }} className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700">Tạo dòng nhập kết quả</button>}
    </article>)}</div>}
    {form && <form onSubmit={(event) => void save(event)} className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <h3 className="font-semibold text-slate-900">Nhập kết quả · {form.category === 'LAB' ? 'Xét nghiệm' : 'Hình ảnh'}</h3>
      <label className="block text-sm font-medium text-slate-700">{form.category === 'LAB' ? 'Chỉ số / tên xét nghiệm' : 'Loại hình ảnh'}<input required maxLength={180} value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      {form.category === 'LAB' && <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]"><label className="text-sm font-medium text-slate-700">Giá trị đo<input maxLength={10000} value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label><label className="text-sm font-medium text-slate-700">Đơn vị<input maxLength={80} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label></div>}
      {form.category === 'IMAGING' && <label className="block text-sm font-medium text-slate-700">Kết quả máy đo<textarea rows={2} maxLength={10000} value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>}
      <label className="block text-sm font-medium text-slate-700">Phát hiện hoặc nhận xét<textarea rows={3} maxLength={10000} value={form.finding} onChange={(event) => setForm({ ...form, finding: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <label className="block text-sm font-medium text-slate-700">Kết luận chuyên môn<textarea rows={3} maxLength={10000} value={form.professionalConclusion} onChange={(event) => setForm({ ...form, professionalConclusion: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2" /></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => setForm(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Hủy</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Đang lưu…' : 'Lưu kết quả và kết luận'}</button></div>
    </form>}
  </section>;
}

function ClinicalResults({ orders, query, onQuery, status, onStatus, statuses, canRead }: { orders: Order[]; query: string; onQuery: (value: string) => void; status: string; onStatus: (value: string) => void; statuses: string[]; canRead: boolean }) {
  const results = orders.flatMap((order) => [
    ...order.labResults.map((result) => ({ key: result.id, order, kind: 'Xét nghiệm', title: result.testName, value: `${result.result}${result.unit ? ` ${result.unit}` : ''}`, imageId: '' })),
    ...order.imagingResults.map((result) => ({ key: result.id, order, kind: 'Hình ảnh', title: result.imagingType, value: result.conclusion, imageId: result.hasImage ? result.id : '' })),
  ]);
  return <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><div><h2 className="text-lg font-bold text-[#20334b]">Kết quả cận lâm sàng</h2><p className="mt-1 text-sm text-slate-500">Kết quả lưu dưới các chỉ định được gắn với lượt khám.</p></div><div className="mt-4"><OrderSearch query={query} onQuery={onQuery} /></div><div className="mt-2"><label className="sr-only">Lọc theo trạng thái chỉ định</label><select value={status} onChange={(event) => onStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-auto"><option value="">Tất cả trạng thái</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
    {!canRead ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Không có quyền đọc kết quả cận lâm sàng của Visit này.</p> : results.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">Chưa có kết quả được lưu trong phạm vi Visit này.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f5f8fc] text-xs text-slate-500"><tr><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Kết quả</th><th className="px-3 py-3">Giá trị</th><th className="px-3 py-3">Chỉ định</th><th className="px-3 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{results.map((result) => <tr key={result.key}><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><FlaskConical size={15} className="text-blue-600" />{result.kind}</span></td><td className="px-3 py-3 font-medium">{result.title}</td><td className="max-w-[28rem] whitespace-pre-wrap px-3 py-3 text-slate-700">{result.value}{result.imageId && <img src={`/api/bacsi/clinical-results/${encodeURIComponent(result.imageId)}/image`} alt={`Ảnh kết quả ${result.title}`} className="mt-2 max-h-64 rounded-lg border border-slate-200 bg-white object-contain" />}</td><td className="px-3 py-3 text-xs text-slate-500">{result.order.service?.name ?? result.order.type} · {dateTime(result.order.orderedAt)}</td><td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{result.order.status}</span></td></tr>)}</tbody></table></div>}
  </section>;
}
