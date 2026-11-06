'use client';

import { Bell, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { notificationsApi, type NotificationDraft } from '../api/notificationsApi';

export function NotificationsPanel() {
  const [drafts, setDrafts] = useState<NotificationDraft[] | null>(null);
  const [draftError, setDraftError] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [typeInput, setTypeInput] = useState('');
  const [statusInput, setStatusInput] = useState('');
  const [filters, setFilters] = useState<{ type?: string; status?: string; page: number }>({ page: 0 });
  const page = filters.page;
  const { data, selected, isLoading, error, refresh, loadDetail, clearDetail } = useNotifications(filters);

  const formatDate = (value: string | null) => value
    ? new Date(value).toLocaleString('vi-VN')
    : 'Không có thời gian dự kiến';

  async function loadDrafts() {
    setDraftLoading(true);
    setDraftError('');
    try {
      setDrafts(await notificationsApi.getWorkbookDrafts());
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : 'Không thể tải mẫu.');
    } finally {
      setDraftLoading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Thông báo của tài khoản">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-indigo-700"><Bell size={18} /><span className="text-sm font-semibold">Thông báo của tài khoản đang đăng nhập</span></div>
          <p className="text-sm text-slate-600">Trạng thái hiển thị đúng theo dữ liệu Notification; hệ thống hiện chưa lưu trạng thái đã đọc.</p>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </header>

      <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold">Mẫu nhắc tái khám và dặn dò sau điều trị</h2>
        <p className="text-sm">Các mẫu từ workbook đang chờ duyệt. Lịch gửi và biên tập trên hệ thống chưa khả dụng.</p>
        {!drafts && <button type="button" className="rounded border bg-white px-3 py-2 text-sm" onClick={() => void loadDrafts()} disabled={draftLoading}>
          {draftLoading ? 'Đang tải…' : 'Xem mẫu bản nháp'}
        </button>}
        {draftError && <p role="alert" className="text-sm text-rose-800">{draftError}</p>}
        {drafts?.map((draft) => <details key={draft.code} className="rounded border bg-white p-3">
          <summary className="cursor-pointer text-sm font-medium">{draft.code} · {draft.name} · Nháp</summary>
          <p className="mt-2 text-xs text-slate-600">{draft.scope} · Chưa có phiên bản trên hệ thống</p>
          <p className="my-2 whitespace-pre-wrap text-sm">{draft.body}</p>
          <p className="text-xs text-slate-600">{draft.notes}</p>
        </details>)}
      </section>

      <form className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); setFilters({ ...(typeInput.trim() ? { type: typeInput.trim() } : {}), ...(statusInput.trim() ? { status: statusInput.trim() } : {}), page: 0 }); }}>
        <label className="text-xs font-medium text-slate-600">Loại (giá trị chính xác)
          <input value={typeInput} onChange={(event) => setTypeInput(event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <label className="text-xs font-medium text-slate-600">Trạng thái (giá trị chính xác)
          <input value={statusInput} onChange={(event) => setStatusInput(event.target.value)} maxLength={64} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </label>
        <button type="submit" className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Lọc</button>
        <button type="button" onClick={() => { setTypeInput(''); setStatusInput(''); setFilters({ page: 0 }); }} className="self-end rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Xóa lọc</button>
      </form>

      {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {isLoading && <div role="status" className="flex items-center gap-2 py-10 text-sm text-slate-600"><LoaderCircle size={18} className="animate-spin" />Đang tải thông báo…</div>}

      {!isLoading && data && data.rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
          <Bell size={28} className="mx-auto mb-2 text-slate-400" />
          <p className="font-medium text-slate-700">Không có thông báo trong phạm vi tài khoản này.</p>
        </div>
      )}

      {!isLoading && data && data.rows.length > 0 && <div className="space-y-3">
        {data.rows.map((notification) => (
          <article key={notification.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{notification.type}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">{notification.status}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-800">{notification.content}</p>
                <p className="text-xs text-slate-500">Thời gian dự kiến: {formatDate(notification.scheduledAt)}</p>
              </div>
              <button type="button" onClick={() => selected?.id === notification.id ? clearDetail() : void loadDetail(notification.id)} className="shrink-0 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                {selected?.id === notification.id ? 'Ẩn chi tiết' : 'Xem chi tiết'}
              </button>
            </div>
            {selected?.id === notification.id && <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-3 text-xs text-slate-500">Mã thông báo: {selected.id}</p>
              {selected.deliveryHistory === null ? <p className="text-sm text-slate-500">Lịch sử delivery chưa được cấp quyền hiển thị hoặc chưa có permission tương ứng.</p> : selected.deliveryHistory.length === 0 ? <p className="text-sm text-slate-500">Chưa có bản ghi delivery.</p> : (
                <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-2">Kênh</th><th className="p-2">Trạng thái delivery</th><th className="p-2">Lần thử</th><th className="p-2">Thời điểm delivered</th></tr></thead><tbody className="divide-y">{selected.deliveryHistory.map((delivery) => <tr key={delivery.id}><td className="p-2">{delivery.channel}</td><td className="p-2">{delivery.status}</td><td className="p-2">{formatDate(delivery.attemptedAt)}</td><td className="p-2">{formatDate(delivery.deliveredAt)}</td></tr>)}</tbody></table></div>
              )}
              <p className="mt-3 text-xs text-amber-700">Schema hiện chưa có read receipt; xem chi tiết không đánh dấu đã đọc. Dữ liệu delivery không chứng minh người nhận đã đọc thông báo.</p>
            </div>}
          </article>
        ))}
      </div>}

      {data && <footer className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-600">
        <span>{data.totalRows} thông báo · Trang {data.page + 1}</span>
        <div className="flex gap-2">
          <button type="button" aria-label="Trang trước" disabled={page === 0 || isLoading} onClick={() => setFilters((current) => ({ ...current, page: Math.max(0, current.page - 1) }))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Trang sau" disabled={(page + 1) * data.pageSize >= data.totalRows || page >= 200 || isLoading} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))} className="rounded-lg border p-2 disabled:opacity-40"><ChevronRight size={16} /></button>
        </div>
      </footer>}
    </section>
  );
}
