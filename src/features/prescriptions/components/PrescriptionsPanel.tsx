'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, FileClock, Plus, Search, ShieldAlert, Trash2 } from 'lucide-react';

type Medicine = { id: string; name: string; unit: string; stock: string; unitCost: string; ingredients: Array<{ ingredient: { id: string; name: string } }> };
type DraftItem = { medicineId: string; quantity: number; dosage: string };
type Visit = {
  id: string; visitDate: string; status: string;
  patient: { id: string; fullName: string; patientCode: string; allergies: Array<{ substance: string; reaction: string | null; severity: string | null }> };
  prescriptions: Array<{ id: string; status: string; items: Array<{ id: string; medicineId: string; quantity: string; dosage: string; medicine: { name: string; unit: string } }> }>;
};
type Warning = { kind: 'ALLERGY' | 'INTERACTION'; severity: string; message: string };
const statusLabels: Record<string, string> = { WAITING: 'Chờ khám', REGISTERED: 'Đã đăng ký', CHECKED_IN: 'Đã tiếp nhận', IN_PROGRESS: 'Đang khám', EXAMINING: 'Đang khám', WAITING_RESULT: 'Chờ kết quả', RESULT_READY: 'Đã có kết quả' };

function money(value: string | number) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('vi-VN').format(number) : '—';
}

export function PrescriptionsPanel({ initialVisitId = '' }: { initialVisitId?: string }) {
  const [data, setData] = useState<{ medicines: Medicine[]; visits: Visit[]; selectedVisitId: string }>({ medicines: [], visits: [], selectedVisitId: '' });
  const [visitId, setVisitId] = useState(initialVisitId);
  const [rows, setRows] = useState<DraftItem[]>([]);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [review, setReview] = useState<Warning[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [acknowledgedRisks, setAcknowledgedRisks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function load(nextVisitId = visitId) {
    setLoading(true);
    try {
      const response = await fetch(`/api/prescriptions${nextVisitId ? `?visitId=${encodeURIComponent(nextVisitId)}` : ''}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không tải được dữ liệu kê đơn.');
      setData(payload.data);
      const nextId = payload.data.selectedVisitId;
      if (nextId && nextId !== nextVisitId) setVisitId(nextId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không tải được dữ liệu kê đơn.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(initialVisitId); }, []); // Initial assigned-visit read only.

  const selectedVisit = data.visits.find((visit) => visit.id === visitId) ?? data.visits.find((visit) => visit.id === data.selectedVisitId) ?? null;
  const selectedMedicineIds = useMemo(() => rows.map((row) => row.medicineId).filter(Boolean), [rows]);
  const selectedIdsKey = selectedMedicineIds.join('|');
  const medicines = data.medicines.filter((medicine) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || medicine.name.toLowerCase().includes(query) || medicine.ingredients.some(({ ingredient }) => ingredient.name.toLowerCase().includes(query));
    const available = Number(medicine.stock) > 0;
    return matchesQuery && (stockFilter === 'all' || (stockFilter === 'available' ? available : !available));
  });

  useEffect(() => {
    if (!visitId || selectedMedicineIds.length === 0 || selectedMedicineIds.some((id) => !data.medicines.some((medicine) => medicine.id === id))) {
      setReview([]);
      return;
    }
    const controller = new AbortController();
    const items = rows.filter((row) => row.medicineId).map(({ medicineId, quantity, dosage }) => ({ medicineId, quantity: Number(quantity) || 1, dosage: dosage || 'Chưa nhập hướng dẫn dùng' }));
    setReviewLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/prescriptions', {
          method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
          body: JSON.stringify({ mode: 'review', visitId, items }),
        });
        const payload = await response.json();
        if (response.ok) setReview(payload.data.warnings);
        else setReview(payload.data?.warnings ?? []);
      } catch { /* The draft remains unissued; communicate review state through loading/error on save. */ }
      finally { if (!controller.signal.aborted) setReviewLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [visitId, selectedIdsKey, rows, data.medicines]);

  function updateRow(index: number, changes: Partial<DraftItem>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...changes } : row));
    setAcknowledgedRisks(false);
    setMessage('');
  }

  function addMedicine(medicineId: string) {
    if (rows.some((row) => row.medicineId === medicineId)) return;
    setRows((current) => [...current, { medicineId, quantity: 1, dosage: '' }]);
    setAcknowledgedRisks(false);
    setMessage('');
  }

  async function saveDraft() {
    if (!selectedVisit || rows.length === 0 || rows.some((row) => !row.medicineId || !row.dosage.trim() || Number(row.quantity) <= 0)) {
      setMessage('Chọn lượt khám, thuốc, số lượng và hướng dẫn dùng cho từng thuốc.');
      return;
    }
    if (reviewLoading) { setMessage('Đang rà soát dị ứng và tương tác thuốc. Hãy chờ rà soát hoàn tất.'); return; }
    if (review.length && !acknowledgedRisks) { setMessage('Hãy đọc và xác nhận đã rà soát cảnh báo trước khi lưu đơn nháp.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'draft', visitId: selectedVisit.id, items: rows, acknowledgedRisks }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không thể lưu đơn nháp.');
      setMessage('Đơn đã được lưu ở trạng thái NHÁP. Chưa phát hành, chưa lên lịch và chưa trừ tồn kho.');
      setRows([]);
      setReview([]);
      setAcknowledgedRisks(false);
      await load(selectedVisit.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu đơn nháp.');
    } finally {
      setSaving(false);
    }
  }

  async function changeVisit(nextId: string) {
    setVisitId(nextId);
    setRows([]);
    setReview([]);
    setAcknowledgedRisks(false);
    setMessage('');
    const url = new URL(window.location.href);
    url.searchParams.set('visitId', nextId);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    await load(nextId);
  }

  const draftTotal = rows.reduce((total, row) => {
    const medicine = data.medicines.find((item) => item.id === row.medicineId);
    return total + (medicine ? Number(medicine.unitCost) * Number(row.quantity || 0) : 0);
  }, 0);

  return <div className="space-y-4">
    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_auto]"><label className="text-xs font-semibold text-slate-600">Bệnh nhân / lượt khám<select value={selectedVisit?.id ?? ''} onChange={(event) => void changeVisit(event.target.value)} disabled={loading || data.visits.length === 0} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900">{data.visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.patient.fullName} · {visit.patient.patientCode} · {visit.id} · {new Date(visit.visitDate).toLocaleString('vi-VN')}</option>)}</select></label><div className="flex flex-col justify-end text-xs"><span>Trạng thái lượt khám</span><span className="mt-1 font-semibold text-blue-700">{selectedVisit ? statusLabels[selectedVisit.status] ?? selectedVisit.status : 'Chưa chọn'}</span></div>{selectedVisit && <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-slate-50 p-3 text-xs md:col-span-2"><span>Bệnh nhân: <b>{selectedVisit.patient.fullName}</b></span><span>Mã BN: <b>{selectedVisit.patient.patientCode}</b></span><span>Dị ứng đã ghi nhận: <b>{selectedVisit.patient.allergies.map((allergy) => allergy.substance).join(', ') || 'Chưa ghi nhận'}</b></span></div>}</section>

    {!loading && !selectedVisit && <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">Không có lượt khám đang hoạt động được phân công cho tài khoản bác sĩ này.</div>}

    {selectedVisit && <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Danh mục thuốc</h2><p className="mt-1 text-xs text-slate-500">Thuốc đang hoạt động trong DB</p><label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"><Search size={14} className="text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full text-xs outline-none" placeholder="Tìm tên thuốc hoặc hoạt chất" /></label><label className="mt-3 block text-[11px] text-slate-500">Lọc tồn kho<select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="mt-1 w-full rounded-md border p-2 text-xs"><option value="all">Tất cả thuốc hoạt động</option><option value="available">Có tồn kho</option><option value="empty">Hết tồn kho</option></select></label><div className="mt-3 max-h-[680px] space-y-2 overflow-auto">{medicines.map((medicine) => {
        const alreadyAdded = rows.some((row) => row.medicineId === medicine.id);
        return <article key={medicine.id} className={`rounded-lg border p-3 ${alreadyAdded ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}><div className="flex items-start justify-between gap-2"><div><h3 className="text-xs font-semibold">{medicine.name}</h3><p className="mt-1 text-[10px] text-slate-500">{medicine.ingredients.map(({ ingredient }) => ingredient.name).join(' · ') || 'Chưa có hoạt chất liên kết'}</p></div>{alreadyAdded ? <Check size={14} className="text-blue-700" /> : <button type="button" onClick={() => addMedicine(medicine.id)} className="text-blue-700"><Plus size={16} /></button>}</div><div className="mt-2 flex justify-between text-[10px] text-slate-500"><span>Tồn kho tham khảo: {medicine.stock} {medicine.unit}</span><span>{money(medicine.unitCost)} đ/{medicine.unit}</span></div></article>;
      })}{!medicines.length && <p className="p-6 text-center text-xs text-slate-500">Không có thuốc khớp điều kiện lọc.</p>}</div></aside>

      <div className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-bold">Thuốc đang soạn</h2><p className="mt-1 text-xs text-slate-500">{rows.length} thuốc · đơn chưa phát hành</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-800">Trạng thái: NHÁP</span></div>{rows.length === 0 ? <p className="mt-4 rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">Chọn thuốc từ danh mục để bắt đầu kê đơn cho lượt khám này.</p> : <div className="mt-3 space-y-3">{rows.map((row, index) => {
          const medicine = data.medicines.find((item) => item.id === row.medicineId);
          return <article key={`${row.medicineId}-${index}`} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-semibold">{medicine?.name ?? 'Thuốc không còn trong danh mục'}</h3><p className="mt-1 text-[11px] text-slate-500">{medicine?.ingredients.map(({ ingredient }) => ingredient.name).join(' · ') || 'Chưa có hoạt chất'}</p></div><button type="button" onClick={() => { setRows((current) => current.filter((_, itemIndex) => itemIndex !== index)); setAcknowledgedRisks(false); }} aria-label="Xóa thuốc khỏi đơn nháp" className="text-rose-600"><Trash2 size={15} /></button></div><div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]"><label className="text-[11px] font-medium text-slate-600">Liều dùng / cách dùng<input value={row.dosage} onChange={(event) => updateRow(index, { dosage: event.target.value })} maxLength={500} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-xs" placeholder="Ví dụ: thoa lớp mỏng buổi tối" /></label><label className="text-[11px] font-medium text-slate-600">Số lượng ({medicine?.unit ?? 'đơn vị'})<input type="number" inputMode="decimal" min="0.01" max="1000" step="0.01" value={row.quantity} onChange={(event) => updateRow(index, { quantity: Number(event.target.value) })} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-xs" /></label></div></article>;
        })}</div>}</section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div><h2 className="font-bold">Rà soát an toàn thuốc</h2><p className="mt-1 text-xs text-slate-500">So khớp dị ứng của bệnh nhân và tương tác hoạt chất từ dữ liệu hiện có.</p></div><ShieldAlert size={17} className="text-amber-600" /></div>{reviewLoading ? <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Đang rà soát dữ liệu thuốc…</p> : review.length ? <div className="mt-3 space-y-2">{review.map((warning, index) => <div key={`${warning.kind}-${index}`} className="flex gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><div><b>{warning.kind === 'ALLERGY' ? 'Cảnh báo dị ứng' : `Tương tác · ${warning.severity}`}</b><p className="mt-1">{warning.message}</p></div></div>)}<label className="mt-2 flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" checked={acknowledgedRisks} onChange={(event) => setAcknowledgedRisks(event.target.checked)} className="mt-0.5" />Tôi đã đọc các cảnh báo và xác nhận chỉ lưu đơn ở trạng thái nháp để bác sĩ rà soát tiếp.</label></div> : <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{rows.length ? 'Chưa phát hiện cảnh báo phù hợp trong dữ liệu dị ứng/tương tác hiện có.' : 'Chọn thuốc để rà soát dị ứng và tương tác.'}</p>}</section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Đơn đã lưu cho lượt khám</h2><p className="mt-1 text-xs text-slate-500">Đơn nháp không được phát hành hoặc tự động gửi.</p></div><FileClock size={16} className="text-slate-400" /></div>{selectedVisit.prescriptions.length ? <div className="mt-3 space-y-2">{selectedVisit.prescriptions.map((prescription) => <article key={prescription.id} className="rounded-lg border border-slate-200 p-3"><div className="flex justify-between gap-2"><b className="text-xs">Đơn thuốc · {prescription.id}</b><span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{prescription.status === 'DRAFT' ? 'Nháp' : prescription.status}</span></div>{prescription.items.map((item) => <p key={item.id} className="mt-2 text-xs">{item.medicine.name} · {item.quantity} {item.medicine.unit} · {item.dosage}</p>)}</article>)}</div> : <p className="mt-3 text-xs text-slate-500">Chưa có đơn thuốc gắn với lượt khám này.</p>}</section>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs">
          <p className="text-slate-500">Lưu nháp không trừ kho, không phát hành toa và không hoàn tất Visit.</p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">Tạm tính: {money(draftTotal)} đ</span>
            <button type="button" onClick={() => void saveDraft()} disabled={saving || loading || rows.length === 0 || reviewLoading} className="rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu đơn nháp'}</button>
            <Link
              href={{
                pathname: '/bacsi/clinical-services',
                query: { visitId: selectedVisit.id, date: selectedVisit.visitDate.slice(0, 10) },
                hash: 'hoan-tat-kham',
              }}
              prefetch={false}
              aria-disabled={saving || loading}
              onClick={(event) => { if (saving || loading) event.preventDefault(); }}
              onNavigate={(event) => {
                if (rows.length > 0 && !window.confirm('Bạn có thuốc chưa lưu. Quay về màn khám sẽ bỏ các mục đang soạn. Bạn muốn quay về?')) {
                  event.preventDefault();
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-blue-700 hover:bg-blue-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Quay về Khám bệnh &amp; Chỉ định
            </Link>
          </div>
        </footer>
      </div>
    </div>}
    {message && <p role="status" className={`rounded-lg px-4 py-3 text-sm ${message.includes('trạng thái NHÁP') || message.includes('Đã') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{message}</p>}
  </div>;
}
