'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Activity, AlertCircle, ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, FileText, FlaskConical, HeartPulse, Pill, Stethoscope } from 'lucide-react';
import { getDoctorPatientWorkspace } from '../patient-record-actions';

type PatientOption = { id: string; fullName: string; patientCode: string; latestVisitId: string };
type Tab = 'overview' | 'history' | 'treatment' | 'results' | 'documents';

const tabs: Array<{ id: Tab; label: string; icon: typeof FileText }> = [
  { id: 'overview', label: 'Tổng hợp bệnh án', icon: FileText },
  { id: 'history', label: 'Lịch sử khám', icon: CalendarDays },
  { id: 'treatment', label: 'Phác đồ điều trị', icon: Activity },
  { id: 'results', label: 'Kết quả cận lâm sàng', icon: FlaskConical },
  { id: 'documents', label: 'Tài liệu', icon: ClipboardList },
];

const visitStatusLabels: Record<string, string> = {
  WAITING: 'Chờ khám', REGISTERED: 'Đã đăng ký', CHECKED_IN: 'Đã tiếp nhận', IN_PROGRESS: 'Đang khám', EXAMINING: 'Đang khám',
  WAITING_RESULT: 'Chờ kết quả', RESULT_READY: 'Đã có kết quả', COMPLETED: 'Hoàn tất', DONE: 'Hoàn tất', CANCELLED: 'Đã hủy', NO_SHOW: 'Không đến',
};
const planStatusLabels: Record<string, string> = { ACTIVE: 'Đang hoạt động', IN_PROGRESS: 'Đang thực hiện', COMPLETED: 'Hoàn tất', PAUSED: 'Tạm dừng', CANCELLED: 'Đã hủy', PLANNED: 'Lên kế hoạch' };
const publishedOrderStatuses = new Set(['COMPLETED', 'RESULT_READY', 'PUBLISHED']);

function date(value?: string | null, withTime = false) {
  if (!value) return 'Chưa ghi nhận';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }).format(parsed);
}

function age(value?: string | null) {
  if (!value) return 'Chưa có ngày sinh';
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return 'Chưa có ngày sinh';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) years -= 1;
  return `${years} tuổi`;
}

function maskPhone(value?: string | null) {
  if (!value) return 'Chưa có số điện thoại';
  const digits = value.replace(/\D/g, '');
  return digits.length > 4 ? `${digits.slice(0, 3)} ••• •• ${digits.slice(-2)}` : 'Đã lưu';
}

function statusStyle(status: string) {
  if (['COMPLETED', 'DONE'].includes(status)) return 'bg-emerald-50 text-emerald-700';
  if (['IN_PROGRESS', 'EXAMINING'].includes(status)) return 'bg-blue-50 text-blue-700';
  if (['CANCELLED', 'NO_SHOW'].includes(status)) return 'bg-slate-100 text-slate-600';
  return 'bg-amber-50 text-amber-800';
}

function visitSummary(visit: any) {
  const record = visit.medicalRecord;
  return record?.notes?.trim() || record?.finalDiagnosis?.trim() || record?.preliminaryDiagnosis?.trim() || 'Chưa ghi nhận tóm tắt bệnh án.';
}

export function PatientRecordWorkspace({ patients, data, selectedVisitId }: { patients: PatientOption[]; data: any; selectedVisitId: string }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState(data);
  const [activeVisitId, setActiveVisitId] = useState(selectedVisitId);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestNumber = useRef(0);
  const patient = profile.patient;
  const visits = profile.visits as any[];
  const plans = profile.treatmentPlans as any[];
  const selectedVisit = visits.find((visit) => visit.id === activeVisitId) ?? visits[0];
  const currentVisit = visits.find((visit) => ['WAITING', 'REGISTERED', 'CHECKED_IN', 'IN_PROGRESS', 'EXAMINING', 'WAITING_RESULT', 'RESULT_READY'].includes(visit.status)) ?? visits[0];
  const assignedVisitCount = visits.length;
  const publishedResults = visits.flatMap((visit) => visit.orders
    .filter((order: any) => publishedOrderStatuses.has(order.status))
    .flatMap((order: any) => [
      ...order.labResults.map((result: any) => ({ id: result.id, visit, order, label: result.testName, value: `${result.result}${result.unit ? ` ${result.unit}` : ''}`, fileUrl: '' })),
      ...order.imagingResults.map((result: any) => ({ id: result.id, visit, order, label: result.imagingType, value: result.conclusion, fileUrl: result.fileUrl ?? '' })),
    ]));
  const documents = visits.flatMap((visit) => [
    ...visit.treatmentImages.map((image: any) => ({ id: image.id, visit, label: image.description || image.imageType || 'Ảnh theo dõi', type: image.phase || 'Hình ảnh', date: image.capturedAt, href: image.imageUrl })),
    ...visit.orders.flatMap((order: any) => order.imagingResults.filter((result: any) => result.fileUrl).map((result: any) => ({ id: result.id, visit, label: result.imagingType, type: 'Tệp kết quả cận lâm sàng', date: order.orderedAt, href: result.fileUrl }))),
    ...visit.consents.filter((consent: any) => consent.documentUrl).map((consent: any) => ({ id: consent.id, visit, label: consent.template?.name || 'Phiếu đồng thuận', type: `Tài liệu đồng thuận · v${consent.template?.version ?? ''}`, date: consent.signedAt, href: consent.documentUrl })),
  ]).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const activePlans = plans.filter((plan) => ['ACTIVE', 'IN_PROGRESS', 'PLANNED'].includes(plan.status));
  const openVisitHref = currentVisit ? `/bacsi/clinical-services?date=${encodeURIComponent(currentVisit.visitDate.slice(0, 10))}&visitId=${encodeURIComponent(currentVisit.id)}` : '/bacsi/queue';

  async function selectPatient(patientId: string) {
    if (patientId === patient.id || loadingPatient) return;
    const requestId = ++requestNumber.current;
    setLoadingPatient(true);
    setLoadError('');
    try {
      const result = await getDoctorPatientWorkspace(patientId);
      if (requestId !== requestNumber.current) return;
      if (!result.success || !result.data) {
        setLoadError(result.success ? 'Không tìm thấy hồ sơ được phân công.' : result.error);
        return;
      }
      setProfile(result.data);
      setActiveVisitId(result.selectedVisitId);
      const url = new URL(window.location.href);
      url.searchParams.set('patientId', patientId);
      if (result.selectedVisitId) url.searchParams.set('visitId', result.selectedVisitId);
      else url.searchParams.delete('visitId');
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      if (requestId === requestNumber.current) setLoadError('Không tải được hồ sơ. Vui lòng thử lại.');
    } finally {
      if (requestId === requestNumber.current) setLoadingPatient(false);
    }
  }

  function selectVisit(visitId: string) {
    setActiveVisitId(visitId);
    const url = new URL(window.location.href);
    url.searchParams.set('patientId', patient.id);
    url.searchParams.set('visitId', visitId);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  return <main className="mx-auto max-w-[1440px] space-y-4 pb-8 text-slate-800">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Hồ sơ bệnh nhân / Bệnh án</h1><p className="mt-1 text-sm text-slate-500">Thông tin lâm sàng liên tục qua các lượt khám và đợt điều trị.</p></div>
      {currentVisit && <Link href={openVisitHref} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Stethoscope size={15} /> Mở lượt khám hiện tại</Link>}
    </header>

    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
      <label className="text-xs font-semibold text-slate-600">Bệnh nhân
        <select value={patient.id} disabled={loadingPatient} onChange={(event) => void selectPatient(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-70">
          {patients.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.patientCode}</option>)}
        </select>
        <span className="mt-1 block font-normal text-slate-500">{patient.patientCode} · {age(patient.dateOfBirth)} · {date(patient.dateOfBirth)}</span>
      </label>
      <div><p className="text-xs text-slate-500">Lượt khám</p><select value={selectedVisit?.id ?? ''} onChange={(event) => selectVisit(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-900">{visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.id} · {visit.room?.department?.name ?? 'Chưa phân khoa'}</option>)}</select></div>
      <div><p className="text-xs text-slate-500">Thời điểm lượt khám</p><p className="mt-1 text-sm font-semibold text-slate-900">{selectedVisit ? date(selectedVisit.visitDate, true) : 'Chưa có lượt khám'}</p><p className="text-xs text-slate-500">{selectedVisit?.employee?.fullName ?? 'Bác sĩ được phân công'}</p></div>
      <span className={`rounded-full px-3 py-1.5 text-center text-xs font-semibold ${patient.allergies.length ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{patient.allergies.length ? `Dị ứng: ${patient.allergies.map((item: any) => item.substance).join(', ')}` : 'Chưa có dữ liệu dị ứng'}</span>
    </section>

    {(loadingPatient || loadError) && <p role={loadError ? 'alert' : 'status'} className={`rounded-lg px-3 py-2 text-xs ${loadError ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{loadError || 'Đang tải hồ sơ bệnh nhân…'}</p>}

    <nav className="flex gap-5 overflow-x-auto border-b border-slate-200" aria-label="Các mục hồ sơ bệnh nhân">
      {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-1 py-3 text-xs ${tab === id ? 'border-blue-700 font-semibold text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><Icon size={14} />{label}</button>)}
    </nav>

    {tab === 'overview' && <div className="grid gap-4 lg:grid-cols-[minmax(250px,.75fr)_minmax(0,1.8fr)]">
      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="font-bold">Thông tin hành chính</h2><span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-500">Chỉ xem</span></div><div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 text-xs"><Field label="Họ và tên" value={patient.fullName} /><Field label="Mã hồ sơ" value={patient.patientCode} /><Field label="Ngày sinh" value={date(patient.dateOfBirth)} /><Field label="Số điện thoại" value={maskPhone(patient.phone)} /></div></section>
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Tiền sử &amp; dị ứng</h2>{patient.allergies.length ? <div className="mt-3 space-y-2">{patient.allergies.map((allergy: any) => <div key={allergy.id} className="flex gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800"><AlertCircle size={14} className="mt-0.5 shrink-0" /><div><b>{allergy.substance}</b><p className="mt-1">{[allergy.reaction, allergy.severity].filter(Boolean).join(' · ') || 'Chưa ghi nhận phản ứng/mức độ.'}</p></div></div>)}</div> : <div className="mt-3 flex gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800"><AlertCircle size={14} className="mt-0.5 shrink-0" /><div><b>Chưa có dữ liệu dị ứng</b><p className="mt-1">Không có bản ghi dị ứng được lưu trong hồ sơ.</p></div></div>}{patient.histories.length ? <div className="mt-4 space-y-3">{patient.histories.map((item: any) => <div key={item.id}><p className="text-[11px] text-slate-500">{item.type}{item.diagnosisDate ? ` · ${date(item.diagnosisDate)}` : ''}</p><p className="mt-1 text-xs font-semibold text-slate-800">{item.content}</p></div>)}</div> : <p className="mt-4 text-xs text-slate-500">Chưa có tiền sử bệnh được ghi nhận.</p>}</section>
      </div>

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Ghi chú bệnh án lượt khám</h2><p className="mt-1 text-[11px] text-slate-500">Lượt khám: {selectedVisit?.id ?? 'Chưa có lượt khám'}</p>{selectedVisit?.medicalRecord ? <><p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-700">{selectedVisit.medicalRecord.notes || 'Chưa có ghi chú khám bệnh.'}</p><div className="mt-4 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3"><Field label="Chẩn đoán sơ bộ" value={selectedVisit.medicalRecord.preliminaryDiagnosis || 'Chưa ghi nhận'} /><Field label="Chẩn đoán cuối cùng" value={selectedVisit.medicalRecord.finalDiagnosis || 'Chưa xác định'} /><Field label="Bác sĩ điều trị" value={selectedVisit.employee?.fullName || 'Chưa ghi nhận'} /></div></> : <p className="mt-3 rounded-lg bg-slate-50 p-4 text-xs text-slate-500">Chưa có bệnh án được lưu cho lượt khám này.</p>}</section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">Lịch sử lượt khám</h2><p className="mt-1 text-[11px] text-slate-500">{Math.min(3, assignedVisitCount)} lượt gần nhất · {assignedVisitCount} lượt trong phạm vi bác sĩ</p></div><button type="button" onClick={() => setTab('history')} className="text-xs font-semibold text-blue-700">Xem tất cả</button></div><VisitTable visits={visits.slice(0, 3)} selectedId={selectedVisit?.id} onSelect={selectVisit} /></section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="font-bold">Điều trị đang theo dõi</h2><button type="button" onClick={() => setTab('treatment')} className="text-xs font-semibold text-blue-700">Xem phác đồ</button></div>{activePlans.length === 0 ? <p className="mt-3 text-xs text-slate-500">Chưa có phác đồ điều trị đang theo dõi.</p> : <div className="mt-3 space-y-3">{activePlans.slice(0, 2).map((plan: any) => <PlanSummary key={plan.id} plan={plan} />)}</div>}</section>
      </div>
    </div>}

    {tab === 'history' && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Lịch sử lượt khám</h2><p className="mt-1 text-xs text-slate-500">Các lượt khám trong phạm vi được phân công; thông tin cũ chỉ xem.</p><VisitTable visits={visits} selectedId={selectedVisit?.id} onSelect={selectVisit} detailed /></section>}

    {tab === 'treatment' && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Phác đồ điều trị</h2><p className="mt-1 text-xs text-slate-500">Phác đồ gắn với các lượt khám được phân công cho bác sĩ.</p>{plans.length === 0 ? <EmptyNotice text="Chưa có phác đồ điều trị được ghi nhận trong hồ sơ này." /> : <div className="mt-4 space-y-3">{plans.map((plan: any) => <article key={plan.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{plan.name}</h3><p className="mt-1 text-xs text-slate-500">{plan.protocolTemplate?.code ? `${plan.protocolTemplate.code} · ` : ''}{plan.protocolTemplate?.name || `Phiên bản ${plan.version}`} · {date(plan.startDate)}{plan.expectedEndDate ? ` – ${date(plan.expectedEndDate)}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(plan.status)}`}>{planStatusLabels[plan.status] ?? plan.status}</span></div>{plan.diagnosisSummary && <p className="mt-3 text-sm text-slate-700">{plan.diagnosisSummary}</p>}{plan.goal && <p className="mt-1 text-xs text-slate-600">Mục tiêu: {plan.goal}</p>}<div className="mt-4 grid gap-3 sm:grid-cols-3"><Field label="Phiên bản" value={String(plan.version)} /><Field label="Buổi đã hoàn thành" value={`${plan.stages.flatMap((stage: any) => stage.sessions).filter((session: any) => session.status === 'COMPLETED').length} / ${plan.stages.flatMap((stage: any) => stage.sessions).length}`} /><Field label="Giai đoạn hiện tại" value={plan.stages.find((stage: any) => !['COMPLETED', 'DONE'].includes(stage.status))?.name || 'Đã hoàn tất'} /></div><div className="mt-4 space-y-2">{plan.stages.map((stage: any) => <div key={stage.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs"><span><b>{stage.orderNo}. {stage.name}</b>{stage.goal ? ` · ${stage.goal}` : ''}</span><span className="text-slate-500">{stage.sessions.filter((session: any) => session.status === 'COMPLETED').length}/{stage.sessions.length} buổi · {planStatusLabels[stage.status] ?? stage.status}</span></div>)}</div><Link href={`/bacsi/treatments?visitId=${encodeURIComponent(plan.visitId)}`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">Mở phác đồ điều trị <ArrowUpRight size={13} /></Link></article>)}</div>}</section>}

    {tab === 'results' && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Kết quả cận lâm sàng</h2><p className="mt-1 text-xs text-slate-500">Chỉ hiển thị kết quả đã công bố trong các lượt khám được phân công.</p>{publishedResults.length === 0 ? <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800"><b>Chưa có kết quả mới để công bố</b><p className="mt-1 text-xs">Không dùng dữ liệu mẫu thay thế kết quả lâm sàng thực tế.</p></div> : <div className="mt-4 space-y-3">{publishedResults.map((result: any) => <article key={result.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{result.label}</h3><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{result.value || 'Chưa có nhận xét'}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Đã công bố</span></div><p className="mt-2 text-xs text-slate-500">{result.order.service?.name ?? result.order.type} · {result.visit.id} · {date(result.order.orderedAt, true)}</p>{result.fileUrl && <a href={result.fileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">Mở tệp kết quả <ArrowUpRight size={12} /></a>}</article>)}</div>}</section>}

    {tab === 'documents' && <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Tài liệu hồ sơ</h2><p className="mt-1 text-xs text-slate-500">Ảnh theo dõi, tệp kết quả và tài liệu đồng thuận gắn với Visit được phân công.</p>{documents.length === 0 ? <EmptyNotice text="Chưa có tài liệu đính kèm trong các lượt khám được phân công." /> : <div className="mt-4 divide-y divide-slate-100">{documents.map((document: any) => <article key={`${document.visit.id}-${document.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><b className="text-sm">{document.label}</b><p className="mt-1 text-xs text-slate-500">{document.type} · {document.visit.id} · {date(document.date, true)}</p></div>{document.href && <a href={document.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-700">Mở tài liệu <ArrowUpRight size={12} /></a>}</article>)}</div>}</section>}

    <footer className="flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-500"><span>Clinic EMR · Chỉ sử dụng cho công việc chuyên môn</span><span>Bảo mật hồ sơ bệnh nhân</span></footer>
  </main>;
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-semibold text-slate-900">{value}</p></div>;
}

function EmptyNotice({ text }: { text: string }) {
  return <p className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-600">{text}</p>;
}

function VisitTable({ visits, selectedId, onSelect, detailed = false }: { visits: any[]; selectedId?: string; onSelect: (id: string) => void; detailed?: boolean }) {
  if (visits.length === 0) return <EmptyNotice text="Chưa có lượt khám được phân công trong hồ sơ này." />;
  return <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="px-3 py-2.5">Ngày / Lượt khám</th><th className="px-3 py-2.5">Chuyên khoa</th><th className="px-3 py-2.5">Tóm tắt bệnh án</th>{detailed && <th className="px-3 py-2.5">Bác sĩ</th>}<th className="px-3 py-2.5">Kết quả</th></tr></thead><tbody className="divide-y divide-slate-100">{visits.map((visit) => <tr key={visit.id} className={visit.id === selectedId ? 'bg-blue-50/70' : 'hover:bg-slate-50'}><td className="px-3 py-3"><button type="button" onClick={() => onSelect(visit.id)} className="text-left font-medium text-blue-700 hover:underline">{date(visit.visitDate)}<span className="mt-1 block text-[11px] text-slate-500">{visit.id}</span></button></td><td className="px-3 py-3">{visit.room?.department?.name ?? 'Chưa phân khoa'}</td><td className="max-w-[28rem] whitespace-pre-wrap px-3 py-3">{visitSummary(visit).slice(0, detailed ? 320 : 150)}{visitSummary(visit).length > (detailed ? 320 : 150) ? '…' : ''}</td>{detailed && <td className="px-3 py-3">{visit.employee?.fullName ?? 'Chưa ghi nhận'}</td>}<td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(visit.status)}`}>{visitStatusLabels[visit.status] ?? visit.status}</span></td></tr>)}</tbody></table></div>;
}

function PlanSummary({ plan }: { plan: any }) {
  const sessions = plan.stages.flatMap((stage: any) => stage.sessions);
  const completed = sessions.filter((session: any) => session.status === 'COMPLETED').length;
  const nextSession = sessions.find((session: any) => session.status !== 'COMPLETED' && session.scheduledAt);
  return <article className="border-t border-slate-100 pt-3 first:border-0 first:pt-0"><div className="flex items-start justify-between gap-3"><div><b className="text-xs">{plan.name}</b><p className="mt-1 text-[11px] text-slate-500">{plan.protocolTemplate?.code ?? plan.id} · Phiên bản {plan.version}{plan.startDate ? ` · ${date(plan.startDate)}` : ''}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusStyle(plan.status)}`}>{planStatusLabels[plan.status] ?? plan.status}</span></div><div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-3"><Field label="Giai đoạn hiện tại" value={plan.stages.find((stage: any) => !['COMPLETED', 'DONE'].includes(stage.status))?.name || 'Đã hoàn tất'} /><Field label="Buổi đã thực hiện" value={`${completed}/${sessions.length}`} /><Field label="Buổi tiếp theo" value={nextSession?.scheduledAt ? date(nextSession.scheduledAt, true) : 'Chưa xếp lịch'} /></div></article>;
}
