'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { completeAssignedVisit } from '@/features/emr/actions';
import { prescriptionsApi } from '@/features/prescriptions/api/prescriptionsApi';
import { usePrescriptions } from '@/features/prescriptions/hooks/usePrescriptions';
import type { PrescriptionItemInput, PrescriptionView } from '@/features/prescriptions/schemas/prescriptions.schema';

type DraftItem = { medicineId: string; quantity: string; dosage: string };
const blankItem = (): DraftItem => ({ medicineId: '', quantity: '', dosage: '' });

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function PrescriptionsPanel({ initialVisitId }: { initialVisitId?: string }) {
  const router = useRouter();
  const { data, visits, medicines, isLoading, error, setError, load, loadVisits, loadMedicines, getById } = usePrescriptions();
  const [search, setSearch] = useState('');
  const [medicineSearch, setMedicineSearch] = useState('');
  const [selected, setSelected] = useState<PrescriptionView | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visitId, setVisitId] = useState('');
  const [visitFilterId, setVisitFilterId] = useState(initialVisitId ?? '');
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [isSaving, setIsSaving] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isCompletingVisit, setIsCompletingVisit] = useState(false);
  const submitLock = useRef(false);

  useEffect(() => {
    if (initialVisitId) void loadVisits();
  }, [initialVisitId, loadVisits]);

  const openCreate = async () => {
    setError(null);
    setSelected(null);
    setEditingId(null);
    setVisitId(initialVisitId ?? '');
    setItems([blankItem()]);
    setIsEditorOpen(true);
    const [assignedVisits] = await Promise.all([loadVisits(), loadMedicines()]);
    if (initialVisitId && !assignedVisits.some((visit) => visit.id === initialVisitId)) {
      setVisitId('');
      setError('Visit không nằm trong phạm vi được phân công hoặc không thể truy cập.');
    }
  };

  const openEdit = async (prescription: PrescriptionView) => {
    if (!prescription.canEdit) return;
    setError(null);
    setEditingId(prescription.id);
    setVisitId(prescription.visit.id);
    setItems(prescription.items.map((item) => ({
      medicineId: item.medicineId,
      quantity: item.quantity,
      dosage: item.dosage,
    })));
    setIsEditorOpen(true);
    await Promise.all([loadVisits(), loadMedicines()]);
  };

  const openDetail = async (id: string) => {
    const prescription = await getById(id);
    if (prescription) {
      setSelected(prescription);
      setIsEditorOpen(false);
    } else {
      setSelected(null);
    }
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitLock.current || isSaving) return;
    submitLock.current = true;
    setIsSaving(true);
    setError(null);

    const payload: PrescriptionItemInput[] = items.map((item) => ({
      medicineId: item.medicineId,
      quantity: Number(item.quantity),
      dosage: item.dosage,
    }));

    try {
      const result = editingId
        ? await prescriptionsApi.update(editingId, { items: payload })
        : await prescriptionsApi.create({ visitId, items: payload });
      setSelected(result);
      setIsEditorOpen(false);
      await load(search || undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu đơn thuốc.');
    } finally {
      setIsSaving(false);
      submitLock.current = false;
    }
  };

  const issueSelected = async () => {
    if (!selected?.canEdit || isIssuing) return;
    const confirmed = window.confirm('Phát hành đơn thuốc và trừ chính xác số lượng thuốc khỏi tồn kho? Hành động này không thể hoàn tác tại đây.');
    if (!confirmed) return;
    setError(null);
    setIsIssuing(true);
    try {
      await prescriptionsApi.issue(selected.id);
      setSelected({ ...selected, status: 'ISSUED', canEdit: false });
      await load(search || undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể phát hành đơn thuốc.');
    } finally {
      setIsIssuing(false);
    }
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((current) => current.map((item, currentIndex) => currentIndex === index ? { ...item, ...patch } : item));
  };

  const visiblePrescriptions = (data?.prescriptions ?? []).filter((prescription) =>
    !visitFilterId || prescription.visit.id === visitFilterId,
  );
  const selectedAssignedVisit = visits.find((visit) => visit.id === visitId);
  const completionVisit = initialVisitId ? visits.find((visit) => visit.id === initialVisitId) : undefined;
  const hasPrescriptionForVisit = Boolean(data?.prescriptions.some((prescription) => prescription.visit.id === initialVisitId && prescription.items.length > 0));
  const visitCanBeCompleted = Boolean(completionVisit && ['IN_PROGRESS', 'EXAMINING'].includes(completionVisit.status));
  const canCompleteVisit = Boolean(initialVisitId && data?.canWrite && visitCanBeCompleted && hasPrescriptionForVisit);
  const addMedicine = (medicineId: string) => {
    setItems((current) => {
      const emptyLine = current.findIndex((item) => !item.medicineId);
      if (emptyLine >= 0) return current.map((item, index) => index === emptyLine ? { ...item, medicineId } : item);
      return current.length < 50 ? [...current, { medicineId, quantity: '', dosage: '' }] : current;
    });
  };

  const completeVisit = async () => {
    if (!initialVisitId || !canCompleteVisit || isCompletingVisit) return;
    setIsCompletingVisit(true);
    setError(null);
    try {
      const result = await completeAssignedVisit(initialVisitId);
      if (!result.success) {
        setError(result.error);
        setIsCompletingVisit(false);
        return;
      }
      const date = completionVisit?.visitDate.slice(0, 10);
      router.push(`/bacsi/queue${date ? `?date=${encodeURIComponent(date)}` : ''}`);
      router.refresh();
    } catch {
      setError('Không thể hoàn tất Visit. Hãy thử lại.');
      setIsCompletingVisit(false);
    }
  };

  return (
    <div className="space-y-6">
      <style>{`@media print { body * { visibility: hidden !important; } .prescription-print-area, .prescription-print-area * { visibility: visible !important; } .prescription-print-area { display: block !important; position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; padding: 24px !important; color: #111 !important; background: #fff !important; } }`}</style>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">MED-01 · Kê đơn thuốc</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">Đơn thuốc trong Visit được phân công</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">Danh sách được lọc phía máy chủ theo Visit của nhân viên đang đăng nhập. Không kiểm tra tương tác thuốc hoặc dị ứng.</p>
          </div>
          <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => document.getElementById('prescription-history')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Xem lịch sử đơn thuốc</button>
          {data?.canWrite && (
            <button type="button" onClick={() => void openCreate()} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Tạo đơn nháp
            </button>
          )}
          </div>
        </div>

        {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void load(search.trim() || undefined); }}>
          <label className="sr-only" htmlFor="prescription-search">Tìm theo bệnh nhân, mã bệnh nhân hoặc thuốc</label>
          <input id="prescription-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Tìm bệnh nhân, mã bệnh nhân hoặc thuốc" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          <button type="submit" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Tìm đơn</button>
          <button type="button" onClick={() => { setSearch(''); setVisitFilterId(''); void load(); }} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Xóa lọc</button>
        </form>

        {visitFilterId && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#edf5ff] px-3 py-2 text-sm text-[#235f9e]">
          <span>Danh sách được lọc theo Visit đã mở từ trang khám. Dữ liệu vẫn được giới hạn phía máy chủ theo tài khoản.</span>
          <div className="flex items-center gap-3">
            {initialVisitId && <button type="button" onClick={() => void completeVisit()} disabled={!canCompleteVisit || isCompletingVisit} title={!completionVisit ? 'Đang xác minh Visit được phân công.' : !visitCanBeCompleted ? 'Visit cần ở trạng thái Đang khám.' : !hasPrescriptionForVisit ? 'Cần lưu đơn thuốc có ít nhất một thuốc.' : undefined} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300">{isCompletingVisit ? 'Đang hoàn tất…' : 'Hoàn tất lượt khám'}</button>}
            <button type="button" onClick={() => setVisitFilterId('')} className="font-semibold hover:underline">Bỏ lọc Visit</button>
          </div>
        </div>}

        {isLoading ? (
          <p role="status" className="mt-6 rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-600">Đang tải đơn thuốc…</p>
        ) : visiblePrescriptions.length ? (
          <div id="prescription-history" className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr><th className="px-4 py-3">Bệnh nhân / Visit</th><th className="px-4 py-3">Người kê</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thuốc</th><th className="px-4 py-3">Thao tác</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePrescriptions.map((prescription) => (
                  <tr key={prescription.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{prescription.visit.patient.fullName}</div>
                      <div className="text-xs text-slate-500">{prescription.visit.patient.patientCode} · {formatVisitDate(prescription.visit.visitDate)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{prescription.employeeName}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{prescription.status}</span></td>
                    <td className="px-4 py-3 text-slate-700">{prescription.items.length}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void openDetail(prescription.id)} className="text-sm font-medium text-blue-700 hover:underline">Xem chi tiết</button>
                        {prescription.canEdit && <button type="button" onClick={() => void openEdit(prescription)} className="text-sm font-medium text-slate-700 hover:underline">Sửa nháp</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Tối đa 100 đơn gần lượt khám nhất được trả về cho mỗi truy vấn.</p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="font-medium text-slate-800">Chưa có đơn thuốc trong phạm vi được phép.</p>
            <p className="mt-1 text-sm text-slate-600">Nếu bạn có quyền kê đơn, có thể tạo đơn nháp từ một Visit được phân công.</p>
            {visitFilterId && <button type="button" onClick={() => setVisitFilterId('')} className="mt-3 text-sm font-medium text-blue-700 hover:underline">Xóa bộ lọc Visit</button>}
          </div>
        )}
      </section>

      {isEditorOpen && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(270px,320px)_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#e1e9f2] bg-white p-5 shadow-sm">
          <div>
            <h3 className="font-semibold text-[#20334b]">Danh mục thuốc</h3>
            <p className="mt-1 text-xs text-slate-500">Chỉ hiển thị thuốc đang hoạt động từ danh mục.</p>
          </div>
          <form className="mt-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); void loadMedicines(medicineSearch.trim() || undefined); }}>
            <label className="sr-only" htmlFor="medicine-search">Tìm thuốc đang hoạt động</label>
            <input id="medicine-search" value={medicineSearch} onChange={(event) => setMedicineSearch(event.target.value)} maxLength={100} placeholder="Tên thuốc hoặc hoạt chất…" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Tìm</button>
          </form>
          <div className="mt-4 space-y-2">
            {medicines.length ? medicines.map((medicine) => (
              <article key={medicine.id} className="rounded-lg border border-[#e1e9f2] bg-[#f5f8fc] p-3">
                <p className="text-sm font-semibold text-[#20334b]">{medicine.name}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-600">Đơn vị: {medicine.unit}</span>
                  <button type="button" disabled={items.length >= 50} onClick={() => addMedicine(medicine.id)} className="rounded-md border border-[#c9d8e8] bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">Thêm vào đơn</button>
                </div>
              </article>
            )) : <p className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Không có thuốc phù hợp trong danh mục.</p>}
          </div>
        </aside>
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 rounded-lg border border-[#cfe0f3] bg-[#edf5ff] p-3 text-sm leading-6 text-[#235f9e]" role="note">
            Đơn nháp chưa trừ kho. Khi bác sĩ phát hành, hệ thống kiểm tra Visit được phân công và tồn thuốc; nếu hợp lệ sẽ trừ kho và ghi lịch sử xuất kho cùng giao dịch.
          </div>
          {selectedAssignedVisit && <div className="mb-4 grid gap-3 rounded-xl border border-[#e1e9f2] bg-white p-4 sm:grid-cols-3 sm:items-center">
            <div><p className="text-xs text-slate-500">Bệnh nhân</p><p className="font-semibold text-[#20334b]">{selectedAssignedVisit.patient.fullName}</p><p className="text-xs text-slate-500">{selectedAssignedVisit.patient.patientCode}</p></div>
            <div><p className="text-xs text-slate-500">Lượt khám</p><p className="text-sm font-medium text-[#20334b]">{formatVisitDate(selectedAssignedVisit.visitDate)}</p></div>
            <div><p className="text-xs text-slate-500">Trạng thái Visit</p><p className="text-sm font-medium text-[#20334b]">{selectedAssignedVisit.status}</p></div>
          </div>}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{editingId ? 'Chỉnh sửa đơn nháp' : 'Tạo đơn thuốc nháp'}</h3>
              <p className="mt-1 text-sm text-slate-600">Người kê được xác định từ session. Các dòng thuốc không tự động gộp và không làm thay đổi tồn kho.</p>
            </div>
            <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">Đóng</button>
          </div>

          <form className="mt-5 space-y-5" onSubmit={(event) => void save(event)}>
            {editingId ? (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
                Visit không thể thay đổi khi sửa: <strong>{selected?.visit.patient.fullName ?? visits.find((visit) => visit.id === visitId)?.patient.fullName ?? 'Visit được phân công'}</strong> · {formatVisitDate(selected?.visit.visitDate ?? visits.find((visit) => visit.id === visitId)?.visitDate ?? new Date().toISOString())}
              </div>
            ) : (
              <div>
                <label htmlFor="prescription-visit" className="mb-1 block text-sm font-medium text-slate-700">Visit được phân công <span className="text-red-600">*</span></label>
                <select id="prescription-visit" required value={visitId} onChange={(event) => setVisitId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="">Chọn Visit</option>
                  {visits.map((visit) => <option key={visit.id} value={visit.id}>{visit.patient.fullName} · {visit.patient.patientCode} · {formatVisitDate(visit.visitDate)}</option>)}
                </select>
                {!visits.length && <p className="mt-1 text-xs text-slate-500">Không có Visit được phân công để kê đơn.</p>}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="font-medium text-slate-900">Thuốc trong đơn</h4>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{items.length} dòng đang soạn</span>
              </div>

              <div className="mt-4 space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[minmax(12rem,2fr)_minmax(7rem,1fr)_minmax(12rem,2fr)_auto] md:items-end">
                    <div>
                      <label htmlFor={`medicine-${index}`} className="mb-1 block text-xs font-medium text-slate-700">Thuốc <span className="text-red-600">*</span></label>
                      <select id={`medicine-${index}`} required value={item.medicineId} onChange={(event) => updateItem(index, { medicineId: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                        <option value="">Chọn thuốc đang hoạt động</option>
                        {medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name} · {medicine.unit}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`quantity-${index}`} className="mb-1 block text-xs font-medium text-slate-700">Số lượng <span className="text-red-600">*</span></label>
                      <input id={`quantity-${index}`} required type="number" min="0.000001" max="1000000" step="any" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label htmlFor={`dosage-${index}`} className="mb-1 block text-xs font-medium text-slate-700">Liều dùng / hướng dẫn <span className="text-red-600">*</span></label>
                      <textarea id={`dosage-${index}`} required maxLength={2000} rows={2} value={item.dosage} onChange={(event) => updateItem(index, { dosage: event.target.value })} placeholder="Bác sĩ nhập hướng dẫn" className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                    </div>
                    <button type="button" disabled={items.length <= 1} onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))} className="rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400">Xóa dòng</button>
                  </div>
                ))}
              </div>
              <button type="button" disabled={items.length >= 50} onClick={() => setItems((current) => [...current, blankItem()])} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Thêm dòng thuốc</button>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setIsEditorOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Hủy</button>
              <button type="submit" disabled={isSaving || (!editingId && !visits.length)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Đang lưu…' : editingId ? 'Lưu thay đổi' : 'Lưu đơn nháp'}</button>
              <span className="self-center text-xs text-slate-500">Lưu đơn nháp trước khi phát hành.</span>
            </div>
          </form>
        </section>
        </div>
      )}

      {selected && !isEditorOpen && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
            <div>
              <p className="text-sm text-slate-500">Chi tiết đơn thuốc</p>
              <h3 className="text-lg font-semibold text-slate-900">{selected.visit.patient.fullName}</h3>
              <p className="text-sm text-slate-600">{selected.visit.patient.patientCode} · Visit {formatVisitDate(selected.visit.visitDate)}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => window.print()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">In đơn</button>
              {selected.canEdit && <button type="button" onClick={() => void openEdit(selected)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white">Sửa nháp</button>}
              {selected.canEdit && <button type="button" disabled={isIssuing} onClick={() => void issueSelected()} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">{isIssuing ? 'Đang phát hành…' : 'Phát hành & trừ kho'}</button>}
            </div>
          </div>
          <div className="mt-4 overflow-x-auto print:hidden">
            <p className="mb-2 text-sm text-slate-600">Người kê: <strong className="font-medium text-slate-900">{selected.employeeName}</strong> · Trạng thái: <strong className="font-medium text-slate-900">{selected.status}</strong></p>
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600"><tr><th className="px-3 py-2">Thuốc</th><th className="px-3 py-2">Đơn vị</th><th className="px-3 py-2">Số lượng</th><th className="px-3 py-2">Liều dùng / hướng dẫn</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{selected.items.map((item) => <tr key={item.id}><td className="px-3 py-3 font-medium text-slate-900">{item.medicine.name}</td><td className="px-3 py-3 text-slate-700">{item.medicine.unit}</td><td className="px-3 py-3 text-slate-700">{item.quantity}</td><td className="px-3 py-3 whitespace-pre-wrap text-slate-700">{item.dosage}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="prescription-print-area hidden">
            <h1 className="text-2xl font-bold">Đơn thuốc</h1>
            <p className="mt-4">Bệnh nhân: <strong>{selected.visit.patient.fullName}</strong> ({selected.visit.patient.patientCode})</p>
            <p>Lượt khám: {formatVisitDate(selected.visit.visitDate)}</p>
            <p>Bác sĩ kê đơn: {selected.employeeName}</p>
            <p>Trạng thái: {selected.status}</p>
            <table className="mt-5 w-full border-collapse text-left text-sm">
              <thead><tr><th className="border-b p-2">Thuốc</th><th className="border-b p-2">Đơn vị</th><th className="border-b p-2">Số lượng</th><th className="border-b p-2">Liều dùng / hướng dẫn</th></tr></thead>
              <tbody>{selected.items.map((item) => <tr key={item.id}><td className="border-b p-2">{item.medicine.name}</td><td className="border-b p-2">{item.medicine.unit}</td><td className="border-b p-2">{item.quantity}</td><td className="border-b p-2 whitespace-pre-wrap">{item.dosage}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
