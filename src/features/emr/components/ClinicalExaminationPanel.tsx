'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ExternalLink, FileText, FlaskConical, Pill, Save, Stethoscope } from 'lucide-react';
import { FollowUpTab } from '@/features/follow-ups/components/FollowUpTab';
import { ClinicalServicesPanel } from '@/features/clinical-services';
import { ClinicalResultsPanel } from './ClinicalResultsPanel';
import { VisitImageUpload } from './VisitImageUpload';
import { completeAssignedClinicalVisit, getAssignedClinicalExamination, saveAssignedClinicalRecord, startAssignedClinicalVisit } from '../examination-actions';

type VisitOption = {
  id: string;
  status: string;
  visitDate: string;
  patient: { patientCode: string; fullName: string };
};

type Visit = VisitOption & {
  patientId: string;
  patient: VisitOption['patient'] & {
    dateOfBirth: string | null;
    phone: string | null;
    allergies: Array<{ id: string; substance: string; reaction: string | null; severity: string | null }>;
  };
  employee: { fullName: string } | null;
  room: { name: string; department: { name: string } } | null;
  medicalRecord: { id: string; preliminaryDiagnosis: string | null; finalDiagnosis: string | null; notes: string | null } | null;
  orders: Array<{
    id: string; type: string; status: string; orderedAt: string;
    service: { code: string; name: string } | null;
    labResults: Array<{ id: string; testName: string; result: string; unit: string | null }>;
    imagingResults: Array<{ id: string; imagingType: string; conclusion: string; fileUrl: string | null }>;
  }>;
  treatmentPlans: Array<{ id: string; name: string; version: number; status: string }>;
  prescriptions: Array<{
    id: string; status: string;
    items: Array<{ id: string; quantity: string; dosage: string; medicine: { name: string; unit: string } }>;
  }>;
};

type Tab = 'record' | 'orders' | 'results' | 'prescriptions' | 'follow-up';

const visitStatusLabels: Record<string, string> = {
  WAITING: 'Chờ khám', CHECKED_IN: 'Đã tiếp nhận', REGISTERED: 'Đã đăng ký',
  IN_PROGRESS: 'Đang khám', EXAMINING: 'Đang khám', WAITING_RESULT: 'Chờ kết quả',
  RESULT_READY: 'Đã có kết quả', COMPLETED: 'Đã hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến',
};
const orderStatusLabels: Record<string, string> = {
  WAITING: 'Chờ thực hiện', CREATED: 'Chờ thực hiện', AWAITING_PAYMENT: 'Chờ thanh toán',
  IN_PROGRESS: 'Đang thực hiện', READY: 'Đang thực hiện', COMPLETED: 'Đã có kết quả',
  RESULT_READY: 'Đã có kết quả', CANCELLED: 'Đã hủy',
};
const tabs: Array<{ id: Tab; label: string; icon: typeof FileText }> = [
  { id: 'record', label: 'Bệnh án', icon: FileText },
  { id: 'orders', label: 'Chỉ định cận lâm sàng', icon: FlaskConical },
  { id: 'results', label: 'Kết quả', icon: Check },
  { id: 'prescriptions', label: 'Đơn thuốc', icon: Pill },
  { id: 'follow-up', label: 'Tái khám & Dặn dò', icon: CalendarDays },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function age(dateOfBirth: string | null) {
  if (!dateOfBirth) return 'Chưa có ngày sinh';
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years -= 1;
  return `${years} tuổi`;
}

export function ClinicalExaminationPanel({ visit: initialVisit, visits, day }: { visit: Visit; visits: VisitOption[]; day: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('orders');
  const [followUpDecision, setFollowUpDecision] = useState<'SCHEDULED' | 'NOT_NEEDED' | 'ON_SYMPTOMS' | null>(null);
  const [followUpGateOpen, setFollowUpGateOpen] = useState(false);
  const [visit, setVisit] = useState(initialVisit);
  const [status, setStatus] = useState(visit.status);
  const initialRecord = {
    preliminaryDiagnosis: visit.medicalRecord?.preliminaryDiagnosis ?? '',
    finalDiagnosis: visit.medicalRecord?.finalDiagnosis ?? '',
    notes: visit.medicalRecord?.notes ?? '',
  };
  const [draft, setDraft] = useState(initialRecord);
  const [saved, setSaved] = useState(initialRecord);
  const [busy, setBusy] = useState(false);
  const [switchingPatient, setSwitchingPatient] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const canStart = ['WAITING', 'CHECKED_IN', 'REGISTERED'].includes(status);
  const canEdit = ['IN_PROGRESS', 'EXAMINING'].includes(status);
  const isReadOnly = !canStart && !canEdit;
  const dirty = draft.preliminaryDiagnosis !== saved.preliminaryDiagnosis || draft.finalDiagnosis !== saved.finalDiagnosis || draft.notes !== saved.notes;
  const hasPrescription = visit.prescriptions.some((prescription) => prescription.items.length > 0);
  const canComplete = canEdit && hasPrescription && !dirty;

  async function selectVisit(id: string) {
    if (!id || id === visit.id || switchingPatient) return;
    setSwitchingPatient(true);
    setMessage(null);
    try {
      const result = await getAssignedClinicalExamination(id, day);
      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      const nextVisit = result.data as Visit;
      const nextRecord = {
        preliminaryDiagnosis: nextVisit.medicalRecord?.preliminaryDiagnosis ?? '',
        finalDiagnosis: nextVisit.medicalRecord?.finalDiagnosis ?? '',
        notes: nextVisit.medicalRecord?.notes ?? '',
      };
      setVisit(nextVisit);
      setFollowUpDecision(null);
      setFollowUpGateOpen(false);
      setStatus(nextVisit.status);
      setDraft(nextRecord);
      setSaved(nextRecord);
      const nextUrl = `/bacsi/clinical-services?date=${encodeURIComponent(day)}&visitId=${encodeURIComponent(id)}`;
      window.history.replaceState(null, '', nextUrl);
    } catch {
      setMessage({ type: 'error', text: 'Không tải được thông tin lượt khám đã chọn. Vui lòng thử lại.' });
    } finally {
      setSwitchingPatient(false);
    }
  }

  function selectDay(value: string) {
    if (value) window.location.assign(`/bacsi/clinical-services?date=${encodeURIComponent(value)}`);
  }

  async function startVisit() {
    if (busy || !canStart) return;
    setBusy(true); setMessage(null);
    try {
      const result = await startAssignedClinicalVisit(visit.id);
      if (!result.success) { setMessage({ type: 'error', text: result.error }); return; }
      setStatus('IN_PROGRESS');
      setMessage({ type: 'success', text: 'Đã bắt đầu khám. Lượt khám chuyển sang trạng thái Đang khám.' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Không bắt đầu được lượt khám. Vui lòng thử lại.' });
    } finally { setBusy(false); }
  }

  async function saveRecord() {
    if (busy || !canEdit || !dirty) return;
    setBusy(true); setMessage(null);
    try {
      const result = await saveAssignedClinicalRecord({ visitId: visit.id, ...draft });
      if (!result.success) { setMessage({ type: 'error', text: result.error }); return; }
      setSaved(draft);
      setMessage({ type: 'success', text: 'Đã lưu bệnh án cho lượt khám này.' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Không lưu được bệnh án. Vui lòng thử lại.' });
    } finally { setBusy(false); }
  }

  async function completeVisit() {
    if (busy || !canComplete) return;
    setBusy(true); setMessage(null);
    try {
      const result = await completeAssignedClinicalVisit(visit.id);
      if (!result.success) {
        if ('code' in result && result.code === 'FOLLOWUP_DECISION_REQUIRED') setFollowUpGateOpen(true);
        setMessage({ type: 'error', text: result.error });
        return;
      }
      setStatus('COMPLETED');
      setMessage({ type: 'success', text: 'Đã hoàn tất lượt khám.' });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Không hoàn tất được lượt khám. Vui lòng thử lại.' });
    } finally { setBusy(false); }
  }

  const resultRows = visit.orders.flatMap((order) => [
    ...order.labResults.map((result) => ({ id: result.id, order, label: result.testName, value: `${result.result}${result.unit ? ` ${result.unit}` : ''}`, fileUrl: '' })),
    ...order.imagingResults.map((result) => ({ id: result.id, order, label: result.imagingType, value: result.conclusion, fileUrl: result.fileUrl ?? '' })),
  ]);

  return <section className="space-y-4 text-slate-800">
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${canEdit ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'}`}>{canStart ? 'Lượt khám đang chờ' : `Lượt khám ${visitStatusLabels[status]?.toLowerCase() ?? status}`}</span>
    </div>

    <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
      <label className="text-xs font-semibold text-slate-600">Bệnh nhân
        <select value={visit.id} disabled={switchingPatient} onChange={(event) => void selectVisit(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 disabled:opacity-60">
          {visits.map((option) => <option key={option.id} value={option.id}>{option.patient.fullName} · {option.patient.patientCode}</option>)}
        </select>
        {switchingPatient && <span className="mt-1 block text-xs font-normal text-blue-700">Đang tải dữ liệu lượt khám…</span>}
        <span className="mt-1 block font-normal text-slate-500">{visit.patient.patientCode} · {age(visit.patient.dateOfBirth)}{visit.patient.phone ? ` · ${visit.patient.phone}` : ''}</span>
      </label>
      <div><p className="text-xs text-slate-500">Lượt khám</p><p className="mt-1 break-all text-sm font-semibold text-slate-900">{visit.id}</p></div>
      <div><p className="text-xs text-slate-500">Thời điểm lượt khám</p><p className="mt-1 text-sm font-semibold text-slate-900">{formatDate(visit.visitDate)}</p><p className="text-xs text-slate-500">{visit.room ? `${visit.room.name} · ${visit.room.department.name}` : 'Chưa xếp phòng'}</p></div>
      <div className="flex flex-col items-start gap-2 md:items-end"><label className="text-[11px] text-slate-500">Ngày xem<input type="date" value={day} onChange={(event) => selectDay(event.target.value)} className="mt-1 block rounded-md border border-slate-200 px-2 py-1 text-xs" /></label>{visit.patient.allergies.length > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"><AlertTriangle size={13} /> Dị ứng: {visit.patient.allergies.map((allergy) => allergy.substance).join(', ')}</span> : <span className="text-xs text-slate-500">Chưa ghi nhận dị ứng</span>}</div>
    </section>

    <nav className="flex gap-5 overflow-x-auto border-b border-slate-200" aria-label="Nội dung lượt khám">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-1 py-3 text-sm ${tab === id ? 'border-blue-600 font-semibold text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon size={15} />{label}{id === 'results' && resultRows.length > 0 ? ` (${resultRows.length})` : ''}</button>)}
    </nav>

    {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-lg border p-3 text-sm ${message.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}

    {(tab === 'record' || tab === 'orders') && <div className={`grid gap-4 ${tab === 'orders' ? 'lg:grid-cols-[1.2fr_.8fr]' : 'grid-cols-1'}`}><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-bold text-slate-900">Ghi nhận khám bệnh</h3><p className="mt-1 text-xs text-slate-500">Các nội dung được lưu vào bệnh án của lượt khám này.</p>
      <div className="mt-4 space-y-3">
        <label className="block text-xs font-medium text-slate-600">Chẩn đoán sơ bộ<textarea maxLength={10000} rows={2} value={draft.preliminaryDiagnosis} onChange={(event) => setDraft({ ...draft, preliminaryDiagnosis: event.target.value })} disabled={!canEdit} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-50" placeholder="Nhập chẩn đoán sơ bộ" /></label>
        <label className="block text-xs font-medium text-slate-600">Chẩn đoán xác định<textarea maxLength={10000} rows={2} value={draft.finalDiagnosis} onChange={(event) => setDraft({ ...draft, finalDiagnosis: event.target.value })} disabled={!canEdit} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 disabled:bg-slate-50" placeholder="Nhập chẩn đoán xác định" /></label>
        <label className="block text-xs font-medium text-slate-600">Ghi chú khám bệnh<textarea maxLength={10000} rows={7} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} disabled={!canEdit} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 text-slate-900 disabled:bg-slate-50" placeholder="Ghi triệu chứng, khám thực thể, diễn tiến và đánh giá lâm sàng." /></label>
      </div>
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500"><b className="text-slate-700">Lưu ý dữ liệu</b><p>Chẩn đoán sơ bộ, chẩn đoán xác định và ghi chú được lưu vào MedicalRecord. Cơ sở dữ liệu hiện chưa có trường riêng cho dấu hiệu sinh tồn.</p></div>
    </section>{tab === 'orders' && <div className="flex min-h-full flex-col gap-4"><ClinicalServicesPanel key={visit.id} initialVisitId={visit.id} compact />
      <section className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Chỉ định &amp; kết quả</h3><p className="mt-1 text-xs text-slate-500">Dữ liệu đã lưu trong lượt khám này.</p></div><button type="button" onClick={() => setTab('results')} className="shrink-0 text-xs font-semibold text-blue-700">Xem tất cả</button></div>{visit.orders.length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">Chưa có chỉ định trong lượt khám này.</p> : <div className="mt-2 divide-y divide-slate-100">{visit.orders.slice(0, 3).map((order) => <article key={order.id} className="flex items-start justify-between gap-3 py-3 first:pt-1"><div className="min-w-0"><b className="block truncate text-sm">{order.service?.name ?? order.type} · {order.id}</b><p className="mt-1 text-[11px] text-slate-500">{order.service?.code ?? order.type} · {formatDate(order.orderedAt)}</p>{[...order.labResults.map((result) => `${result.testName}: ${result.result}${result.unit ? ` ${result.unit}` : ''}`), ...order.imagingResults.map((result) => `${result.imagingType}: ${result.conclusion}`)].map((result, index) => <p key={`${order.id}-result-${index}`} className="mt-1 truncate text-xs text-slate-700">{result}</p>)}</div><span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">{orderStatusLabels[order.status] ?? order.status}</span></article>)}</div>}{resultRows.length === 0 && <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Chưa có kết quả để xem.</p>}{visit.orders.length > 3 && <button type="button" onClick={() => setTab('results')} className="mt-2 text-xs font-semibold text-blue-700">Còn {visit.orders.length - 3} chỉ định · Xem tất cả</button>}</section>
      {visit.patient.allergies.length > 0 && <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><h3 className="font-bold">Kiểm tra dị ứng trước kê đơn</h3><p className="mt-1">{visit.patient.allergies.map((allergy) => `${allergy.substance}${allergy.reaction ? ` · ${allergy.reaction}` : ''}`).join('; ')}</p></section>}
      <div className="grid gap-2 sm:grid-cols-2"><Link href="/bacsi/patients" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-700"><FileText size={14} /> Hồ sơ bệnh nhân <ExternalLink size={12} /></Link><Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visit.id)}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-700"><Pill size={14} /> Kê đơn <ExternalLink size={12} /></Link></div>
    </div>}</div>}

    {tab === 'results' && <div className="space-y-4"><VisitImageUpload key={visit.id} visitId={visit.id} plans={visit.treatmentPlans} /><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Kết quả cận lâm sàng</h3><p className="mt-1 text-xs text-slate-500">Nhập chỉ số, giá trị đo, phát hiện, kết luận chuyên môn và tệp kết quả cho từng chỉ định.</p><ClinicalResultsPanel key={visit.id} orders={visit.orders} canEdit={canEdit} /></section></div>}

    {tab === 'prescriptions' && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Đơn thuốc của lượt khám</h3><p className="mt-1 text-xs text-slate-500">Đơn thuốc và thuốc kê được đọc từ dữ liệu đã lưu cho Visit này.</p></div><Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visit.id)}`} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white">Mở màn kê đơn</Link></div>{visit.prescriptions.length === 0 ? <p className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">Chưa có đơn thuốc cho lượt khám này.</p> : <div className="mt-4 space-y-3">{visit.prescriptions.map((prescription) => <article key={prescription.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><b>Đơn thuốc · {prescription.id}</b><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{prescription.status}</span></div>{prescription.items.length === 0 ? <p className="mt-3 text-sm text-slate-500">Đơn chưa có thuốc.</p> : <div className="mt-3 divide-y divide-slate-100">{prescription.items.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span><b>{item.medicine.name}</b><span className="ml-2 text-slate-500">{item.dosage}</span></span><span>{item.quantity} {item.medicine.unit}</span></div>)}</div>}</article>)}</div>}</section>}

    {tab === 'follow-up' && <FollowUpTab key={visit.id} visitId={visit.id} patientName={visit.patient.fullName} patientCode={visit.patient.patientCode} visitDate={visit.visitDate} specialty={visit.room?.department.name} onOpenOrders={() => setTab('orders')} orderCount={visit.orders.length} prescriptionCount={visit.prescriptions.length} preselectedDecision={followUpDecision} />}

    <section id="hoan-tat-kham" className="flex scroll-mt-24 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Link href={`/bacsi/queue?date=${encodeURIComponent(day)}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"><ArrowLeft size={15} /> Hàng đợi khám</Link>
      <div className="flex flex-wrap gap-2">
        {canStart && <button type="button" disabled={busy} onClick={() => void startVisit()} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang xử lý…' : 'Bắt đầu khám'}</button>}
        {canEdit && <button type="button" disabled={busy || !dirty} onClick={() => void saveRecord()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"><Save size={15} />{busy ? 'Đang lưu…' : 'Lưu bệnh án'}</button>}
        {canEdit && <button type="button" disabled={busy || !canComplete} onClick={() => void completeVisit()} title={!hasPrescription ? 'Cần có đơn thuốc đã kê trước khi hoàn tất lượt khám.' : dirty ? 'Hãy lưu bệnh án trước khi hoàn tất.' : ''} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Hoàn tất lượt khám</button>}
        {isReadOnly && <span className="self-center text-sm text-slate-500">Lượt khám đã kết thúc; bệnh án ở chế độ chỉ xem.</span>}
      </div>
    </section>
    {followUpGateOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="follow-up-gate-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"><h2 id="follow-up-gate-title" className="text-lg font-bold text-slate-900">Chọn quyết định tái khám</h2><p className="mt-2 text-sm text-slate-600">Xác nhận kế hoạch trước khi hoàn tất lượt khám.</p><div className="mt-4 grid gap-2">{([{ value: 'SCHEDULED', label: 'Có hẹn tái khám' }, { value: 'NOT_NEEDED', label: 'Không cần tái khám' }, { value: 'ON_SYMPTOMS', label: 'Quay lại khi có dấu hiệu' }] as const).map((option) => <button key={option.value} type="button" onClick={() => { setFollowUpDecision(option.value); setTab('follow-up'); setFollowUpGateOpen(false); setMessage(null); }} className="rounded-lg border border-slate-200 px-4 py-2.5 text-left text-sm font-medium text-blue-800 hover:bg-blue-50">{option.label}</button>)}</div><button type="button" onClick={() => setFollowUpGateOpen(false)} className="mt-4 text-sm text-slate-600">Đóng</button></section></div>}
  </section>;
}
