'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FlaskConical, Image as ImageIcon, Plus, Search, Send } from 'lucide-react';

type CatalogItem = { code: string; name: string; type: 'LABORATORY' | 'IMAGING'; price: number | string };

export function ClinicalServicesPanel({ initialVisitId = '', compact = false }: { initialVisitId?: string; compact?: boolean }) {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [visitId, setVisitId] = useState(initialVisitId);
  const [tab, setTab] = useState<'LABORATORY' | 'IMAGING'>('LABORATORY');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/cls/catalog')
      .then((response) => response.json())
      .then((payload) => {
        if (!active) return;
        if (payload.success) setCatalog(payload.data as CatalogItem[]);
        else setMessage(payload.message ?? 'Không tải được danh mục dịch vụ.');
      })
      .catch(() => { if (active) setMessage('Không tải được danh mục dịch vụ.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => catalog.filter((item) => item.type === tab && `${item.name} ${item.code}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi'))), [catalog, tab, query]);
  const chosenItems = selected.map((code) => catalog.find((item) => item.code === code)).filter((item): item is CatalogItem => Boolean(item));
  const total = chosenItems.reduce((sum, item) => sum + Number(item.price || 0), 0);

  async function submit() {
    setMessage('');
    if (!visitId.trim() || selected.length === 0 || submitting) {
      if (selected.length === 0) setMessage('Chọn ít nhất một dịch vụ để gửi chỉ định.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/cls/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visitId: visitId.trim(), type: tab, services: chosenItems.map(({ code }) => ({ serviceCode: code })) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setMessage(payload.message ?? 'Không thể tạo chỉ định.');
        return;
      }
      setMessage(`Đã tạo chỉ định ${payload.data.id}.`);
      setSelected([]);
      router.refresh();
    } catch {
      setMessage('Không thể tạo chỉ định. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="text-base font-bold text-slate-900">Chỉ định cận lâm sàng</h2><p className="mt-1 text-xs text-slate-500">Chọn xét nghiệm hoặc chẩn đoán hình ảnh cho lượt khám.</p></div>
      <Plus size={18} className="mt-1 shrink-0 text-blue-700" />
    </div>
    {!initialVisitId && <label className="mt-3 block text-xs font-medium text-slate-600">Mã lượt khám<input value={visitId} onChange={(event) => setVisitId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal" placeholder="Nhập mã lượt khám" /></label>}
    <label className="mt-3 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs"><Search size={15} className="shrink-0 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full outline-none" placeholder="Tìm xét nghiệm, chẩn đoán hình ảnh..." /></label>
    <div className="mt-3 flex border-b border-slate-200">
      <button type="button" onClick={() => setTab('LABORATORY')} className={`px-3 py-2 text-xs ${tab === 'LABORATORY' ? 'border-b-2 border-blue-700 font-semibold text-blue-700' : 'text-slate-500'}`}>Xét nghiệm</button>
      <button type="button" onClick={() => setTab('IMAGING')} className={`px-3 py-2 text-xs ${tab === 'IMAGING' ? 'border-b-2 border-blue-700 font-semibold text-blue-700' : 'text-slate-500'}`}>Hình ảnh</button>
    </div>
    <div className={`mt-3 space-y-2 pr-1 ${compact ? 'max-h-44 overflow-y-auto' : 'max-h-[34rem] overflow-y-auto'}`}>
      {loading ? <p className="p-5 text-center text-xs text-slate-500">Đang tải danh mục…</p> : visible.length === 0 ? <p className="rounded-lg bg-slate-50 p-5 text-center text-xs text-slate-500">Không có dịch vụ phù hợp.</p> : visible.map((item) => {
        const isSelected = selected.includes(item.code);
        return <button key={item.code} type="button" aria-pressed={isSelected} onClick={() => setSelected((current) => isSelected ? current.filter((code) => code !== item.code) : [...current, item.code])} className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
          {item.type === 'LABORATORY' ? <FlaskConical size={17} className="shrink-0 text-slate-600" /> : <ImageIcon size={17} className="shrink-0 text-slate-600" />}
          <span className="min-w-0 flex-1"><b className="block truncate text-xs text-slate-900">{item.name}</b><small className="text-slate-500">{item.code} · {Number(item.price).toLocaleString('vi-VN')} đ</small></span>
          {isSelected && <Check size={16} className="shrink-0 text-blue-700" />}
        </button>;
      })}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
      <p className="text-xs text-slate-600">Đã chọn <b>{selected.length}</b>{selected.length > 0 ? ` · ${total.toLocaleString('vi-VN')} đ` : ''}</p>
      <button type="button" onClick={() => void submit()} disabled={submitting || loading || selected.length === 0 || !visitId.trim()} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={14} />{submitting ? 'Đang gửi…' : 'Gửi chỉ định'}</button>
    </div>
    {message && <p role="status" className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">{message}</p>}
  </section>;
}
