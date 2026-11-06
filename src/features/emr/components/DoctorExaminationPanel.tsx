'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, ExternalLink, FileText, FlaskConical, RefreshCw, Save, Search, ShieldAlert, Stethoscope } from 'lucide-react';
import { saveExaminationMedicalRecord } from '../actions';

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
    labResults: Array<{ id: string; testName: string; result: string; unit: string | null }>;
    imagingResults: Array<{ id: string; imagingType: string; conclusion: string }>;
  }>;
  prescriptions?: Array<{ id: string; status: string; items: Array<{ id: string; dosage: string; medicine: { name: string; unit: string } }> }>;
};

type Props = {
  visit: ExaminationVisit;
  canWrite: boolean;
  writeBlockReason?: string;
  canReadClinicalOrders: boolean;
  canReadPrescriptions: boolean;
};

const tabs = [
  ['record', 'Bệnh án'],
  ['orders', 'Chỉ định cận lâm sàng'],
  ['results', 'Kết quả'],
  ['prescriptions', 'Đơn thuốc'],
] as const;

function dateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
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

export function DoctorExaminationPanel({ visit, canWrite, writeBlockReason, canReadClinicalOrders, canReadPrescriptions }: Props) {
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
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const orderStatuses = useMemo(() => [...new Set((visit.orders ?? []).map((order) => order.status))].sort(), [visit.orders]);

  const dirty = draft.preliminaryDiagnosis !== (savedRecord?.preliminaryDiagnosis ?? '') ||
    draft.finalDiagnosis !== (savedRecord?.finalDiagnosis ?? '') ||
    draft.notes !== (savedRecord?.notes ?? '');
  const filteredOrders = useMemo(() => {
    const orders = visit.orders ?? [];
    const value = query.trim().toLocaleLowerCase('vi-VN');
    return orders.filter((order) => (!orderStatus || order.status === orderStatus) && (!value || [order.id, order.type, order.status, order.service?.code, order.service?.name,
      ...order.labResults.flatMap((result) => [result.testName, result.result]),
      ...order.imagingResults.flatMap((result) => [result.imagingType, result.conclusion]),
    ].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN').includes(value)));
  }, [visit.orders, query, orderStatus]);

  async function refresh() {
    setRefreshing(true);
    setMessage(null);
    window.location.reload();
  }

  async function save() {
    if (!canWrite || !dirty || saving) return;
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Khu vực bác sĩ</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[27px]">Khám bệnh &amp; Chỉ định</h1>
          <p className="mt-1 text-sm text-slate-500">Ghi nhận bệnh án trong phạm vi lượt khám được phân công.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/bacsi/queue" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16} /> Hàng đợi khám</Link>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Làm mới</button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_repeat(3,minmax(0,1fr))] sm:items-center sm:p-5" aria-label="Thông tin lượt khám">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ddedfe] font-bold text-[#235f9e]">{visit.patient.fullName.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toLocaleUpperCase('vi-VN')}</div>
        <div className="min-w-0"><p className="truncate font-semibold text-[#20334b]">{visit.patient.fullName}</p><p className="mt-1 text-xs text-slate-500">{visit.patient.patientCode} · {age(visit.patient.dateOfBirth)}{visit.patient.phone ? ` · ${visit.patient.phone}` : ''}</p></div>
        <div><p className="text-xs text-slate-500">Lượt khám</p><p className="mt-1 break-all text-sm font-semibold text-slate-800">{visit.id}</p></div>
        <div><p className="text-xs text-slate-500">Thời điểm lượt khám</p><p className="mt-1 text-sm font-semibold text-slate-800">{dateTime(visit.visitDate)}</p></div>
        <div className="sm:text-right"><span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{visit.status}</span><p className="mt-1 text-xs text-slate-500">{visit.room ? `${visit.room.name} · ${visit.room.department.name}` : 'Chưa có phòng'}{visit.employee?.fullName ? ` · ${visit.employee.fullName}` : ''}</p></div>
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
              {canWrite
                ? 'Lượt khám chưa có bệnh án. Bệnh án sẽ được tạo khi bạn lưu nội dung khám lần đầu.'
                : 'Lượt khám chưa có bệnh án.'}
            </p>}
          </div>
          <div className="space-y-4">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Chẩn đoán sơ bộ
              <input value={draft.preliminaryDiagnosis} onChange={(event) => setDraft({ ...draft, preliminaryDiagnosis: event.target.value })} readOnly={!canWrite} maxLength={10000} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder={canWrite ? 'Nhập theo đánh giá chuyên môn' : 'Chưa ghi nhận'} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Chẩn đoán xác định
              <input value={draft.finalDiagnosis} onChange={(event) => setDraft({ ...draft, finalDiagnosis: event.target.value })} readOnly={!canWrite} maxLength={10000} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder={canWrite ? 'Nhập khi đã có kết luận chuyên môn' : 'Chưa ghi nhận'} />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">Ghi chú khám bệnh
              <textarea rows={8} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} readOnly={!canWrite} maxLength={10000} className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 font-normal leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" placeholder={canWrite ? 'Ghi nội dung khám theo quy trình đã được phê duyệt' : 'Chưa ghi nhận'} />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {!canWrite && <p className="text-xs text-slate-500">{writeBlockReason ?? 'Lượt khám đang ở chế độ chỉ đọc.'}</p>}
            {canWrite && <button type="button" onClick={() => void save()} disabled={!dirty || saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#246dce] px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} /> {saving ? 'Đang lưu…' : 'Lưu bệnh án'}</button>}
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
                      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-800">{order.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-amber-800">Tạo chỉ định và hoàn tất Visit đang khóa đến khi quy trình CLS/thanh toán và quyền được xác nhận.</p>
          </section>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1"><Link href={`/bacsi/emr?patientId=${encodeURIComponent(visit.patientId)}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><FileText size={16} /> Hồ sơ bệnh nhân <ExternalLink size={14} /></Link>{canReadPrescriptions ? <Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visit.id)}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><ClipboardList size={16} /> Kê đơn <ExternalLink size={14} /></Link> : <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"><ClipboardList size={16} /> Kê đơn chưa được cấp quyền</span>}</div>
        </aside>
      </section>}

      {activeTab === 'orders' && <ClinicalOrders orders={filteredOrders} query={query} onQuery={setQuery} status={orderStatus} onStatus={setOrderStatus} statuses={orderStatuses} canRead={canReadClinicalOrders} />}
      {activeTab === 'results' && <ClinicalResults orders={filteredOrders} query={query} onQuery={setQuery} status={orderStatus} onStatus={setOrderStatus} statuses={orderStatuses} canRead={canReadClinicalOrders} />}
      {activeTab === 'prescriptions' && <section className="rounded-xl border border-[#e1e9f2] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#20334b]">Đơn thuốc của lượt khám</h2>
        {!canReadPrescriptions ? <p className="mt-3 text-sm text-slate-600">Tài khoản hiện tại không có quyền xem đơn thuốc.</p> : (visit.prescriptions ?? []).length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">Chưa có đơn thuốc được lưu cho lượt khám này.</p> : <div className="mt-4 space-y-3">{visit.prescriptions?.map((prescription) => <article key={prescription.id} className="rounded-lg border border-slate-200 p-4"><p className="font-semibold">{prescription.id} · {prescription.status}</p><ul className="mt-2 space-y-1 text-sm text-slate-600">{prescription.items.map((item) => <li key={item.id}>{item.medicine.name} ({item.medicine.unit}) · {item.dosage}</li>)}</ul></article>)}</div>}
        {canReadPrescriptions && <Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(visit.id)}`} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">Mở trang Kê đơn <ExternalLink size={14} /></Link>}
      </section>}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e1e9f2] pt-4 text-xs text-slate-500"><span>Visit và bệnh án được giới hạn theo nhân viên được phân công.</span><div className="flex flex-wrap items-center gap-2"><button type="button" disabled title="Chưa có quy trình và quyền được phê duyệt để đổi trạng thái Visit." className="inline-flex h-10 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500">Hoàn tất lượt khám</button><Link href="/bacsi/queue" className="font-semibold text-blue-700 hover:text-blue-900">Quay lại hàng đợi khám</Link></div></footer>
    </main>
  );
}

type Order = NonNullable<ExaminationVisit['orders']>[number];

function OrderSearch({ query, onQuery }: { query: string; onQuery: (value: string) => void }) {
  return <label className="relative block"><span className="sr-only">Tìm mã chỉ định, dịch vụ hoặc kết quả</span><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => onQuery(event.target.value)} maxLength={100} placeholder="Tìm mã chỉ định, dịch vụ hoặc kết quả…" className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label>;
}

function ClinicalOrders({ orders, query, onQuery, status, onStatus, statuses, canRead }: { orders: Order[]; query: string; onQuery: (value: string) => void; status: string; onStatus: (value: string) => void; statuses: string[]; canRead: boolean }) {
  return <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold text-[#20334b]">Chỉ định cận lâm sàng</h2><p className="mt-1 text-sm text-slate-500">Hiển thị các chỉ định đã lưu cho Visit này.</p></div><button type="button" disabled title="Chưa có luồng tạo ClinicalOrder được xác minh; thao tác được giữ khóa." className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white opacity-50">+ Thêm chỉ định</button></div><div className="mt-4"><OrderSearch query={query} onQuery={onQuery} /></div><div className="mt-2"><label className="sr-only">Lọc theo trạng thái chỉ định</label><select value={status} onChange={(event) => onStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-auto"><option value="">Tất cả trạng thái</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
    {!canRead ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Không có quyền đọc chỉ định cận lâm sàng của Visit này.</p> : orders.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">Không có chỉ định phù hợp trong Visit được phân công.</p> : <div className="mt-4 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-lg border border-slate-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{order.service?.name ?? order.type}</h3><p className="mt-1 text-xs text-slate-500">{order.service?.code ? `${order.service.code} · ` : ''}{order.id} · {dateTime(order.orderedAt)}</p><p className="mt-1 text-xs text-slate-500">Người chỉ định: {order.orderedBy?.fullName ?? 'Chưa có thông tin trong dữ liệu'}</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">{order.status}</span></div><p className="mt-3 text-sm text-slate-600">Loại chỉ định: {order.type}</p><p className="mt-2 text-xs text-amber-800">Tạo chỉ định mới chưa được hỗ trợ vì chưa xác minh API, quyền, quy trình thanh toán và chính sách CLS-01/02.</p></article>)}</div>}
  </section>;
}

function ClinicalResults({ orders, query, onQuery, status, onStatus, statuses, canRead }: { orders: Order[]; query: string; onQuery: (value: string) => void; status: string; onStatus: (value: string) => void; statuses: string[]; canRead: boolean }) {
  const results = orders.flatMap((order) => [
    ...order.labResults.map((result) => ({ key: result.id, order, kind: 'Xét nghiệm', title: result.testName, value: `${result.result}${result.unit ? ` ${result.unit}` : ''}` })),
    ...order.imagingResults.map((result) => ({ key: result.id, order, kind: 'Hình ảnh', title: result.imagingType, value: result.conclusion })),
  ]);
  return <section className="rounded-xl border border-[#e1e9f2] bg-white p-4 shadow-sm sm:p-5"><div><h2 className="text-lg font-bold text-[#20334b]">Kết quả cận lâm sàng</h2><p className="mt-1 text-sm text-slate-500">Kết quả lưu dưới các chỉ định được gắn với lượt khám.</p></div><div className="mt-4"><OrderSearch query={query} onQuery={onQuery} /></div><div className="mt-2"><label className="sr-only">Lọc theo trạng thái chỉ định</label><select value={status} onChange={(event) => onStatus(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 sm:w-auto"><option value="">Tất cả trạng thái</option>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
    {!canRead ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Không có quyền đọc kết quả cận lâm sàng của Visit này.</p> : results.length === 0 ? <p className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">Chưa có kết quả được lưu trong phạm vi Visit này.</p> : <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-[#f5f8fc] text-xs text-slate-500"><tr><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Kết quả</th><th className="px-3 py-3">Giá trị</th><th className="px-3 py-3">Chỉ định</th><th className="px-3 py-3">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{results.map((result) => <tr key={result.key}><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><FlaskConical size={15} className="text-blue-600" />{result.kind}</span></td><td className="px-3 py-3 font-medium">{result.title}</td><td className="max-w-[28rem] whitespace-pre-wrap px-3 py-3 text-slate-700">{result.value}</td><td className="px-3 py-3 text-xs text-slate-500">{result.order.service?.name ?? result.order.type} · {dateTime(result.order.orderedAt)}</td><td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs">{result.order.status}</span></td></tr>)}</tbody></table></div>}
  </section>;
}
