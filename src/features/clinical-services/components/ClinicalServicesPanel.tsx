'use client';

import { FormEvent, useState } from 'react';
import { clinicalServicesApi } from '../api/clinical-servicesApi';
import type { ImagingOrderView, ImagingResultView } from '../schemas/clinical-services.schema';
import { useClinicalServices } from '../hooks/useClinicalServices';

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export function ClinicalServicesPanel() {
  const { data, isLoading, error, reload } = useClinicalServices();
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [formOrderId, setFormOrderId] = useState<string | null>(null);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [imagingType, setImagingType] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function beginCreate(order: ImagingOrderView) {
    setSelectedOrderId(order.id);
    setFormOrderId(order.id);
    setEditingResultId(null);
    setImagingType('');
    setConclusion('');
    setFormError(null);
    setNotice(null);
  }

  function beginEdit(order: ImagingOrderView, result: ImagingResultView) {
    setSelectedOrderId(order.id);
    setFormOrderId(order.id);
    setEditingResultId(result.id);
    setImagingType(result.imagingType);
    setConclusion(result.conclusion);
    setFormError(null);
    setNotice(null);
  }

  function cancelForm() {
    setFormOrderId(null);
    setEditingResultId(null);
    setImagingType('');
    setConclusion('');
    setFormError(null);
  }

  async function submitResult(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formOrderId || saving) return;
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      if (editingResultId) {
        await clinicalServicesApi.updateResult({ resultId: editingResultId, imagingType, conclusion });
        setNotice('Đã cập nhật kết quả hình ảnh.');
      } else {
        await clinicalServicesApi.createResult({ orderId: formOrderId, imagingType, conclusion });
        setNotice('Đã lưu kết quả hình ảnh.');
      }
      cancelForm();
      await reload(appliedSearch);
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Không thể lưu kết quả hình ảnh.');
    } finally {
      setSaving(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
    void reload(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setAppliedSearch('');
    void reload('');
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="imaging-results-heading">
      <header>
        <p className="text-sm font-semibold text-blue-700">CLS-03 · Kết quả hình ảnh cận lâm sàng</p>
        <h2 id="imaging-results-heading" className="mt-1 text-xl font-semibold text-slate-900">Chỉ định trong Visit được phân công</h2>
        <p className="mt-1 text-sm text-slate-600">Danh sách lấy từ PostgreSQL và giới hạn theo nhân viên đang đăng nhập. Ứng dụng chưa có kiểm tra quy trình duyệt kết quả hoặc storage tệp.</p>
      </header>

      <form onSubmit={submitSearch} className="flex flex-wrap gap-2">
        <label htmlFor="imaging-search" className="sr-only">Tìm mã chỉ định, bệnh nhân hoặc kết luận</label>
        <input
          id="imaging-search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          maxLength={120}
          placeholder="Tìm mã chỉ định, bệnh nhân, loại chỉ định hoặc kết luận"
          className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" disabled={isLoading} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50">Tìm kiếm</button>
        <button type="button" onClick={clearSearch} disabled={isLoading} className="rounded-lg px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Xóa lọc</button>
        <button type="button" onClick={() => void reload(appliedSearch)} disabled={isLoading} className="rounded-lg px-3 py-2 text-sm text-blue-700 disabled:opacity-50">Tải lại</button>
      </form>

      {notice && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{notice}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {isLoading ? (
        <p role="status" className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-600">Đang tải chỉ định và kết quả…</p>
      ) : error ? null : data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-medium text-slate-800">Không có chỉ định hình ảnh trong phạm vi được phép.</p>
          <p className="mt-1 text-sm text-slate-600">Chỉ định cần được tạo qua luồng CLS đã được cấp quyền và gắn với Visit được phân công.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((order) => (
            <article key={order.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)} className="min-w-0 text-left">
                  <h3 className="font-semibold text-slate-900">Chỉ định {order.id}</h3>
                  <p className="mt-1 text-sm text-slate-700">{order.visit.patient.fullName} · {order.visit.patient.patientCode}</p>
                  <p className="mt-1 text-xs text-slate-600">Visit {order.visit.id} · {formatDate(order.visit.visitDate)}</p>
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Loại: {order.type}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Trạng thái: {order.status}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">Kết quả: {order.imagingResults.length}</span>
                </div>
                {order.canWrite && <button type="button" onClick={() => beginCreate(order)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white">Thêm kết quả</button>}
                {order.writeBlockedReason && <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Ghi bị khóa: chưa xác minh loại/trạng thái chỉ định</span>}
              </div>
              <div className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <p>Dịch vụ: {order.service ? `${order.service.name} (${order.service.code})` : 'Không liên kết dịch vụ'}</p>
                <p>Người chỉ định: {order.orderedByName ?? 'Chưa có thông tin'}</p>
                <p>Thời điểm chỉ định: {formatDate(order.orderedAt)}</p>
                <p>Trạng thái Visit: {order.visit.status}</p>
              </div>

              {selectedOrderId === order.id && (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  <h4 className="font-medium text-slate-900">Kết quả hình ảnh</h4>
                  {order.imagingResults.length === 0 ? (
                    <p className="text-sm text-slate-600">Chưa có kết quả được lưu cho chỉ định này.</p>
                  ) : order.imagingResults.map((result) => (
                    <div key={result.id} className="rounded-lg bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{result.imagingType}</p>
                        {order.canWrite && <button type="button" onClick={() => beginEdit(order, result)} className="text-sm font-medium text-blue-700">Sửa kết quả</button>}
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{result.conclusion}</p>
                      {result.fileUrl && <p className="mt-2 break-all text-xs text-slate-600">Có tham chiếu tệp trong dữ liệu: {result.fileUrl}. Preview bị tắt vì chưa xác minh storage và kiểm soát truy cập.</p>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {formOrderId && (
        <form onSubmit={submitResult} className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/40 p-4">
          <div>
            <h3 className="font-semibold text-slate-900">{editingResultId ? 'Sửa kết quả hình ảnh' : 'Nhập kết quả hình ảnh'}</h3>
            <p className="mt-1 text-xs text-slate-600">Chỉ lưu loại hình ảnh và kết luận. Trường liên kết tệp chưa được mở vì chưa có storage an toàn được xác minh.</p>
          </div>
          <label className="block space-y-1 text-sm font-medium text-slate-800">
            <span>Chỉ định</span>
            <input readOnly value={data.find((order) => order.id === formOrderId)?.id ?? formOrderId} className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-800">
            <span>Loại hình ảnh</span>
            <input required maxLength={120} value={imagingType} onChange={(event) => setImagingType(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="block space-y-1 text-sm font-medium text-slate-800">
            <span>Kết luận</span>
            <textarea required maxLength={10000} rows={5} value={conclusion} onChange={(event) => setConclusion(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu kết quả'}</button>
            <button type="button" onClick={cancelForm} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm">Hủy</button>
          </div>
        </form>
      )}

      <p className="text-xs text-slate-500">Tối đa 100 chỉ định gần nhất trong phạm vi được phép. Thao tác ghi cần IMAGE_READ và IMAGE_WRITE trong cùng role.</p>
    </section>
  );
}
