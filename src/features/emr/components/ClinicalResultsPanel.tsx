'use client';

import { useState } from 'react';
import { CheckCircle2, Image as ImageIcon, LoaderCircle, Save } from 'lucide-react';

type LabResult = { id: string; testName: string; result: string; unit: string | null };
type ImagingResult = { id: string; imagingType: string; conclusion: string; fileUrl: string | null };
type ClinicalOrder = {
  id: string;
  type: string;
  status: string;
  orderedAt: string;
  service: { code: string; name: string } | null;
  labResults: LabResult[];
  imagingResults: ImagingResult[];
};
type MetricDraft = { testName: string; result: string; unit: string };

const statusLabels: Record<string, string> = {
  WAITING: 'Đang chờ', CREATED: 'Đang chờ', AWAITING_PAYMENT: 'Chờ thanh toán',
  IN_PROGRESS: 'Đang thực hiện', READY: 'Đang thực hiện', COMPLETED: 'Đã có kết quả',
  RESULT_READY: 'Đã có kết quả', CANCELLED: 'Đã hủy',
};

function isComplete(order: ClinicalOrder) {
  return ['COMPLETED', 'RESULT_READY'].includes(order.status) || order.labResults.length > 0 || order.imagingResults.length > 0;
}

export function ClinicalResultsPanel({ orders, canEdit }: { orders: ClinicalOrder[]; canEdit: boolean }) {
  const [drafts, setDrafts] = useState<Record<string, { metrics: MetricDraft[]; conclusion: string; imagingType: string; file: File | null }>>(() =>
    Object.fromEntries(orders.map((order) => [order.id, {
      metrics: [{ testName: '', result: '', unit: '' }],
      conclusion: '', imagingType: order.service?.name ?? 'Kết quả hình ảnh', file: null,
    }])));
  const [savingOrderId, setSavingOrderId] = useState('');
  const [message, setMessage] = useState<{ orderId: string; kind: 'error' | 'success'; text: string } | null>(null);
  const [savedOrders, setSavedOrders] = useState<Set<string>>(() => new Set());

  function patchDraft(orderId: string, patch: Partial<(typeof drafts)[string]>) {
    setDrafts((current) => ({ ...current, [orderId]: { ...current[orderId], ...patch } }));
  }

  async function save(order: ClinicalOrder) {
    const draft = drafts[order.id];
    if (!draft || savingOrderId) return;
    const metrics = draft.metrics.map((row) => ({ ...row, testName: row.testName.trim(), result: row.result.trim(), unit: row.unit.trim() }))
      .filter((row) => row.testName && row.result);
    const conclusion = draft.conclusion.trim();
    if (!metrics.length && !conclusion) {
      setMessage({ orderId: order.id, kind: 'error', text: 'Nhập ít nhất một chỉ số/kết quả hoặc kết luận chuyên môn trước khi lưu.' });
      return;
    }
    if (draft.file && !conclusion) {
      setMessage({ orderId: order.id, kind: 'error', text: 'Vui lòng nhập kết luận chuyên môn trước khi đính kèm tệp kết quả.' });
      return;
    }

    const form = new FormData();
    form.set('payload', JSON.stringify({ orderId: order.id, labResults: metrics, conclusion, imagingType: draft.imagingType }));
    if (draft.file) form.set('file', draft.file);
    setSavingOrderId(order.id);
    setMessage(null);
    try {
      const response = await fetch('/api/doctor/clinical-results', { method: 'POST', body: form, credentials: 'same-origin' });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Không lưu được kết quả cận lâm sàng.');
      setSavedOrders((current) => new Set(current).add(order.id));
      setMessage({ orderId: order.id, kind: 'success', text: 'Đã lưu kết quả vào lượt khám.' });
      window.location.reload();
    } catch (error) {
      setMessage({ orderId: order.id, kind: 'error', text: error instanceof Error ? error.message : 'Không lưu được kết quả. Vui lòng thử lại.' });
    } finally {
      setSavingOrderId('');
    }
  }

  if (orders.length === 0) return <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-blue-50 p-4 text-sm text-blue-800">
    <b>Chưa có chỉ định cận lâm sàng trong lượt khám này.</b>
    <p className="mt-1 text-xs">Tạo chỉ định trước ở mục “Chỉ định cận lâm sàng”; sau đó bác sĩ có thể nhập chỉ số, kết quả và kết luận tại đây.</p>
  </div>;

  return <div className="mt-4 space-y-4">
    {orders.map((order) => {
      const complete = isComplete(order) || savedOrders.has(order.id);
      const editable = canEdit && !complete && ['IN_PROGRESS', 'READY'].includes(order.status);
      const draft = drafts[order.id];
      const conclusion = order.imagingResults.find((item) => item.conclusion)?.conclusion;
      return <article key={order.id} className="rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h4 className="font-semibold text-slate-900">{order.service?.name ?? order.type}</h4><p className="mt-1 text-xs text-slate-500">{order.service?.code ?? order.type} · {order.id}</p></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{complete ? 'Đã có kết quả' : statusLabels[order.status] ?? order.status}</span>
        </div>

        {complete ? <div className="mt-4 space-y-3">
          {order.labResults.length > 0 && <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Chỉ số</th><th className="px-3 py-2">Giá trị / phát hiện</th><th className="px-3 py-2">Đơn vị</th></tr></thead><tbody>{order.labResults.map((result) => <tr key={result.id} className="border-t border-slate-100"><td className="px-3 py-2 font-medium">{result.testName}</td><td className="px-3 py-2 whitespace-pre-wrap">{result.result}</td><td className="px-3 py-2">{result.unit || '—'}</td></tr>)}</tbody></table></div>}
          {conclusion && <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-600">Kết luận chuyên môn</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{conclusion}</p></div>}
          {order.imagingResults.map((result) => result.fileUrl && <a key={result.id} href={result.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 underline"><ImageIcon size={16} /> Mở tệp kết quả</a>)}
        </div> : editable && draft ? <div className="mt-4 space-y-4">
          <div><div className="mb-2 flex items-center justify-between"><div><p className="text-sm font-semibold">Chỉ số / kết quả đo</p><p className="text-xs text-slate-500">Mỗi dòng được lưu vào LabResult hiện có.</p></div><button type="button" onClick={() => patchDraft(order.id, { metrics: [...draft.metrics, { testName: '', result: '', unit: '' }] })} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-blue-700">+ Thêm chỉ số</button></div>
            <div className="space-y-2">{draft.metrics.map((row, index) => <div key={`${order.id}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1.2fr_.6fr_auto]"><input aria-label="Tên chỉ số" maxLength={120} value={row.testName} onChange={(event) => patchDraft(order.id, { metrics: draft.metrics.map((item, i) => i === index ? { ...item, testName: event.target.value } : item) })} placeholder="Tên chỉ số" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><input aria-label="Giá trị đo hoặc phát hiện" maxLength={2000} value={row.result} onChange={(event) => patchDraft(order.id, { metrics: draft.metrics.map((item, i) => i === index ? { ...item, result: event.target.value } : item) })} placeholder="Giá trị đo / phát hiện" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/><input aria-label="Đơn vị" maxLength={60} value={row.unit} onChange={(event) => patchDraft(order.id, { metrics: draft.metrics.map((item, i) => i === index ? { ...item, unit: event.target.value } : item) })} placeholder="Đơn vị" className="rounded-lg border border-slate-200 px-3 py-2 text-sm"/>{draft.metrics.length > 1 && <button type="button" aria-label="Xóa dòng chỉ số" onClick={() => patchDraft(order.id, { metrics: draft.metrics.filter((_, i) => i !== index) })} className="rounded-md px-2 text-sm text-rose-700">Xóa</button>}</div>)}</div>
          </div>
          <label className="block text-sm font-semibold">Kết luận chuyên môn<textarea maxLength={4000} rows={3} value={draft.conclusion} onChange={(event) => patchDraft(order.id, { conclusion: event.target.value })} placeholder="Nhập nhận định và kết luận của bác sĩ từ kết quả cận lâm sàng..." className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal"/><span className="mt-1 block text-xs font-normal text-slate-500">Được lưu vào ImagingResult.conclusion hiện có.</span></label>
          <div className="grid gap-3 md:grid-cols-[1fr_1.5fr]"><label className="block text-xs font-semibold text-slate-600">Loại hình ảnh / kết quả<input maxLength={120} value={draft.imagingType} onChange={(event) => patchDraft(order.id, { imagingType: event.target.value })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"/></label><label className="block text-xs font-semibold text-slate-600">Ảnh hoặc file kết quả<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => patchDraft(order.id, { file: event.target.files?.[0] ?? null })} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal"/><span className="mt-1 block font-normal text-slate-500">JPEG, PNG, WebP hoặc PDF · tối đa 8 MB · lưu riêng tư.</span></label></div>
          {draft.file && <p className="text-xs text-slate-600">Tệp đã chọn: {draft.file.name}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Trạng thái tự chuyển thành “Đã có kết quả” sau khi lưu chỉ số hoặc kết luận.</p><button type="button" disabled={Boolean(savingOrderId)} onClick={() => void save(order)} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{savingOrderId === order.id ? <LoaderCircle size={15} className="animate-spin"/> : <Save size={15}/>} Lưu kết quả</button></div>
          {message?.orderId === order.id && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${message.kind === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
        </div> : <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{canEdit ? 'Có thể nhập kết quả khi chỉ định chuyển sang trạng thái “Đang thực hiện”.' : 'Chỉ lượt khám đang được bác sĩ thực hiện mới cho phép ghi nhận kết quả.'}</p>}
        {complete && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14}/> Kết quả đã được lưu cho chỉ định này.</p>}
      </article>;
    })}
  </div>;
}
