'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ImagePlus, LoaderCircle, ShieldCheck, Upload } from 'lucide-react';
import { postTreatmentImage } from '@/features/emr/upload-treatment-image';

type Plan = { id: string; name: string; version: number; status: string };
const bodyAreas = ['Mặt hai bên', 'Trán', 'Má trái', 'Má phải', 'Cằm', 'Cổ', 'Khác'];

export function VisitImageUpload({ visitId, plans }: { visitId: string; plans: Plan[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [planId, setPlanId] = useState('');
  const [phase, setPhase] = useState('BEFORE');
  const [bodyArea, setBodyArea] = useState(bodyAreas[0]);
  const [imageType, setImageType] = useState('Ảnh lâm sàng');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy) return;
    const form = new FormData();
    form.set('visitId', visitId);
    if (planId) form.set('planId', planId);
    form.set('phase', phase);
    form.set('bodyArea', bodyArea);
    form.set('imageType', imageType.trim());
    form.set('description', description.trim());
    form.set('file', file);
    setBusy(true);
    setMessage(null);
    try {
      await postTreatmentImage(form);
      setFile(null);
      setDescription('');
      setMessage({ kind: 'success', text: 'Ảnh đã được lưu theo lượt khám và sẽ xuất hiện trong Ảnh theo dõi.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Không tải được ảnh lên. Vui lòng thử lại.' });
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="inline-flex items-center gap-2 font-bold text-slate-900"><ImagePlus size={17}/> Ảnh của lượt khám</h3><p className="mt-1 text-xs text-slate-500">Tải ảnh lên độc lập với chỉ định cận lâm sàng. Ảnh được lưu vào Visit và dùng trong trang Ảnh theo dõi để so sánh.</p></div><Link href={`/bacsi/images?visitId=${encodeURIComponent(visitId)}`} className="text-xs font-semibold text-blue-700">Mở Ảnh theo dõi →</Link></div>
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-xs font-medium text-slate-600">Pha ảnh<select value={phase} onChange={(event) => setPhase(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="BEFORE">Trước điều trị</option><option value="AFTER">Sau điều trị</option><option value="FOLLOW_UP">Theo dõi</option></select></label>
      <label className="text-xs font-medium text-slate-600">Vùng cơ thể<select value={bodyArea} onChange={(event) => setBodyArea(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">{bodyAreas.map((area) => <option key={area}>{area}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Phác đồ liên kết <span className="font-normal">(không bắt buộc)</span><select value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"><option value="">Chỉ gắn với lượt khám</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · v{plan.version}</option>)}</select></label>
      <label className="text-xs font-medium text-slate-600">Loại ảnh<input value={imageType} onChange={(event) => setImageType(event.target.value)} maxLength={80} required className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"/></label>
      <label className="text-xs font-medium text-slate-600 md:col-span-2">Mô tả ảnh<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={2} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Mô tả tổn thương hoặc vị trí chụp để đối chiếu về sau"/></label>
      <label className="text-xs font-medium text-slate-600">Chọn ảnh<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"/><span className="mt-1 block font-normal text-slate-500">JPEG, PNG hoặc WebP · tối đa 8 MB · lưu riêng tư.</span></label>
      <div className="flex items-end justify-end xl:col-span-2"><button type="submit" disabled={busy || !file} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <Upload size={15}/>} Lưu ảnh lượt khám</button></div>
    </form>
    <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={13}/> Chỉ bác sĩ được phân công cho lượt khám này mới có thể tải lên và xem ảnh.</p>
    {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`mt-3 rounded-lg p-3 text-sm ${message.kind === 'error' ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>{message.text}</p>}
  </section>;
}
