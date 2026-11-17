'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ImagePlus, Save, Search, ShieldCheck } from 'lucide-react';
import { postTreatmentImage } from '@/features/emr/upload-treatment-image';

type Visit = {
  id: string; visitDate: string; status: string;
  patient: { id: string; fullName: string; patientCode: string; dateOfBirth: string | null };
  treatmentPlans: Array<{ id: string; name: string; version: number; status: string }>;
};
type TreatmentImage = {
  id: string; visitId: string; planId: string | null; sessionId: string | null; imageUrl: string; imageType: string;
  phase: string; bodyArea: string | null; description: string | null; capturedAt: string; capturedById: string | null;
  visit: { id: string; visitDate: string; patient: { id: string; fullName: string; patientCode: string } };
  plan: { id: string; name: string; version: number } | null;
  session: { id: string; sessionNo: number; scheduledAt: string | null } | null;
  capturedBy: { fullName: string } | null;
};
type WorkspaceData = { visits: Visit[]; images: TreatmentImage[] };
type ComparisonSlot = 'before' | 'after';
type ComparisonChoices = Partial<Record<ComparisonSlot, string>>;

const phaseLabels: Record<string, string> = { BEFORE: 'Trước điều trị', AFTER: 'Sau điều trị', FOLLOW_UP: 'Theo dõi' };
const VISIT_IMAGES = '__visit_images__';
const areas = ['Mặt hai bên', 'Trán', 'Má trái', 'Má phải', 'Cằm', 'Cổ', 'Khác'];

function formatDate(value: string, time = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa ghi nhận';
  return new Intl.DateTimeFormat('vi-VN', time ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }).format(date);
}

function ImageFrame({ image, label, manuallySelected }: { image?: TreatmentImage; label: string; manuallySelected: boolean }) {
  return <div className="min-w-0">
    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{label}</span>
    {manuallySelected && <span className="ml-2 text-[11px] font-medium text-blue-700">Đã chọn</span>}
    <div className="mt-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {image ? <a href={image.imageUrl} target="_blank" rel="noreferrer" className="h-full w-full"><img src={image.imageUrl} alt={`${image.imageType} · ${image.bodyArea ?? ''}`} className="h-full w-full object-contain" /></a> : <div className="p-4 text-center text-xs text-slate-400">Chưa có ảnh ở mốc này</div>}
    </div>
    {image && <div className="mt-2 space-y-1 text-[11px] text-slate-600">
      <p>Ngày chụp: <b className="text-slate-800">{formatDate(image.capturedAt, true)}</b></p>
      <p>Pha đã lưu: <b className="text-slate-800">{phaseLabels[image.phase] ?? image.phase}</b></p>
      <p>Vùng cơ thể: <b className="text-slate-800">{image.bodyArea ?? 'Chưa ghi nhận'}</b></p>
      <p>Người chụp: <b className="text-slate-800">{image.capturedBy?.fullName ?? 'Chưa ghi nhận'}</b></p>
      <p>Liên kết: <b className="text-slate-800">{image.session ? `Buổi ${image.session.sessionNo} · ${image.session.id}` : image.plan?.name ?? 'Lượt khám'}</b></p>
    </div>}
  </div>;
}

export function TreatmentImageWorkspace({ initialVisitId }: { initialVisitId: string }) {
  const [data, setData] = useState<WorkspaceData>({ visits: [], images: [] });
  const [visitId, setVisitId] = useState(initialVisitId);
  const [planId, setPlanId] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedImageId, setSelectedImageId] = useState('');
  const [comparisonChoices, setComparisonChoices] = useState<ComparisonChoices>({});
  const [description, setDescription] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [newPhase, setNewPhase] = useState('BEFORE');
  const [newArea, setNewArea] = useState('Mặt hai bên');
  const [newImageType, setNewImageType] = useState('Ảnh lâm sàng');
  const [newDescription, setNewDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  async function loadData(nextVisitId = visitId, afterUpload = false) {
    setLoading(true);
    setMessage(afterUpload ? 'Ảnh đã được lưu vào hồ sơ lượt khám.' : '');
    try {
      const response = await fetch(`/api/doctor/treatment-images${nextVisitId ? `?visitId=${encodeURIComponent(nextVisitId)}` : ''}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.data) throw new Error(payload?.error || 'Không tải được dữ liệu ảnh.');
      setData(payload.data);
      const selectedVisit = payload.data.visits.find((item: Visit) => item.id === nextVisitId) ?? payload.data.visits[0];
      if (!selectedVisit) return;
      if (selectedVisit.id !== nextVisitId) setVisitId(selectedVisit.id);
      const preservePlan = selectedVisit.id === visitId
        && (planId === VISIT_IMAGES || selectedVisit.treatmentPlans.some((plan: Visit['treatmentPlans'][number]) => plan.id === planId));
      const nextPlanId = preservePlan ? planId : selectedVisit.treatmentPlans[0]?.id ?? VISIT_IMAGES;
      setPlanId(nextPlanId);
    } catch (error) {
      setMessage(afterUpload
        ? 'Ảnh đã được lưu. Hãy tải lại trang để xem ảnh mới.'
        : error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Không tải được danh sách ảnh. Vui lòng tải lại trang.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(initialVisitId); }, []); // Initial assigned-visit read only.

  const patients = useMemo(() => [...new Map(data.visits.map((visit) => [visit.patient.id, visit.patient])).values()], [data.visits]);
  const selectedVisit = data.visits.find((visit) => visit.id === visitId) ?? data.visits[0];
  const patientVisits = data.visits.filter((visit) => visit.patient.id === selectedVisit?.patient.id);
  const selectedPlan = selectedVisit?.treatmentPlans.find((plan) => plan.id === planId);
  const selectedPlanScope = planId === VISIT_IMAGES ? null : planId;
  const visitImages = data.images.filter((image) => image.visitId === selectedVisit?.id && image.planId === selectedPlanScope);
  const filteredImages = visitImages.filter((image) => {
    if (areaFilter && image.bodyArea !== areaFilter) return false;
    if (phaseFilter && image.phase !== phaseFilter) return false;
    const day = image.capturedAt.slice(0, 10);
    if (fromDate && day < fromDate) return false;
    if (toDate && day > toDate) return false;
    return true;
  });
  const selectedImage = filteredImages.find((image) => image.id === selectedImageId) ?? filteredImages[0];
  const chosenBefore = visitImages.find((image) => image.id === comparisonChoices.before);
  const chosenAfter = visitImages.find((image) => image.id === comparisonChoices.after);
  const beforeImage = chosenBefore ?? filteredImages
    .filter((image) => image.phase === 'BEFORE' && image.id !== chosenAfter?.id)
    .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))[0];
  const afterImage = chosenAfter ?? filteredImages
    .filter((image) => image.phase === 'AFTER' && image.id !== chosenBefore?.id)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];

  useEffect(() => { setSelectedImageId(filteredImages[0]?.id ?? ''); }, [planId, areaFilter, phaseFilter, fromDate, toDate, data.images]);
  useEffect(() => { setDescription(selectedImage?.description ?? ''); }, [selectedImage?.id, selectedImage?.description]);

  async function choosePatient(patientId: string) {
    const nextVisit = data.visits.find((visit) => visit.patient.id === patientId);
    if (nextVisit) await chooseVisit(nextVisit.id);
  }

  async function chooseVisit(nextVisitId: string) {
    setVisitId(nextVisitId);
    setPlanId('');
    setComparisonChoices({});
    const url = new URL(window.location.href);
    url.searchParams.set('visitId', nextVisitId);
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    await loadData(nextVisitId);
  }

  function chooseComparisonSlot(imageId: string, slot: string) {
    setComparisonChoices((current) => {
      const next = { ...current };
      if (next.before === imageId) delete next.before;
      if (next.after === imageId) delete next.after;
      if (slot === 'before' || slot === 'after') next[slot] = imageId;
      return next;
    });
  }

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVisit || !file || busy) return;
    const form = new FormData();
    form.set('visitId', selectedVisit.id);
    if (selectedPlan) form.set('planId', selectedPlan.id);
    form.set('phase', newPhase);
    form.set('bodyArea', newArea);
    form.set('imageType', newImageType);
    form.set('description', newDescription);
    form.set('file', file);
    setBusy(true);
    setMessage('');
    try {
      await postTreatmentImage(form);
      setUploadOpen(false);
      setFile(null);
      setNewDescription('');
      setPhaseFilter('');
      void loadData(selectedVisit.id, true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải ảnh lên.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDescription() {
    if (!selectedImage) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/doctor/treatment-images', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ imageId: selectedImage.id, description }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Không thể lưu mô tả.');
      await loadData(selectedVisit?.id);
      setMessage('Đã cập nhật mô tả ảnh.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu mô tả.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-[1440px] space-y-4 pb-8 text-slate-800">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Ảnh theo dõi điều trị</h1><p className="mt-1 text-sm text-slate-500">Ảnh được lưu theo lượt khám, có thể liên kết phác đồ và dùng để so sánh theo mốc.</p></div><button type="button" onClick={() => setUploadOpen((open) => !open)} disabled={!selectedVisit} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><ImagePlus size={15} /> Thêm ảnh theo dõi</button></header>

    <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center">
      <label className="text-xs font-semibold text-slate-600">Bệnh nhân<select value={selectedVisit?.patient.id ?? ''} onChange={(event) => void choosePatient(event.target.value)} disabled={loading} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900"><option value="">Chọn bệnh nhân</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.patientCode}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Lượt khám<select value={selectedVisit?.id ?? ''} onChange={(event) => void chooseVisit(event.target.value)} disabled={!selectedVisit || loading} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900">{patientVisits.map((visit) => <option key={visit.id} value={visit.id}>{visit.id} · {formatDate(visit.visitDate)}</option>)}</select></label>
      <label className="text-xs font-semibold text-slate-600">Phác đồ / ảnh lượt khám<select value={planId} onChange={(event) => { setPlanId(event.target.value); setComparisonChoices({}); }} disabled={!selectedVisit || loading} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"><option value={VISIT_IMAGES}>Ảnh lượt khám (chưa gắn phác đồ)</option>{selectedVisit?.treatmentPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · v{plan.version}</option>)}</select></label>
      <div className="text-xs text-slate-500"><p>Thời điểm lượt khám</p><p className="mt-1 font-semibold text-slate-800">{selectedVisit ? formatDate(selectedVisit.visitDate, true) : 'Chưa có lượt khám'}</p><p>{selectedVisit?.patient.fullName ?? ''} · {selectedVisit?.status ?? ''}</p></div>
    </section>

    {uploadOpen && <form onSubmit={uploadImage} className="grid gap-3 rounded-xl border border-blue-200 bg-white p-4 shadow-sm md:grid-cols-3"><div className="md:col-span-3"><h2 className="font-bold">Tải ảnh vào hồ sơ lượt khám</h2><p className="mt-1 text-xs text-slate-500">JPEG, PNG hoặc WebP · tối đa 8 MB. Có thể lưu độc lập với phác đồ. Ảnh được giữ trong bucket riêng tư.</p></div><label className="text-xs font-medium">Pha theo dõi<select value={newPhase} onChange={(event) => setNewPhase(event.target.value)} className="mt-1 w-full rounded-md border p-2"><option value="BEFORE">Trước điều trị</option><option value="AFTER">Sau điều trị</option><option value="FOLLOW_UP">Theo dõi</option></select></label><label className="text-xs font-medium">Vùng cơ thể<select value={newArea} onChange={(event) => setNewArea(event.target.value)} className="mt-1 w-full rounded-md border p-2">{areas.map((area) => <option key={area}>{area}</option>)}</select></label><label className="text-xs font-medium">Loại ảnh<input value={newImageType} onChange={(event) => setNewImageType(event.target.value)} maxLength={80} required className="mt-1 w-full rounded-md border p-2" /></label><label className="text-xs font-medium md:col-span-2">Mô tả<textarea value={newDescription} onChange={(event) => setNewDescription(event.target.value)} maxLength={2000} className="mt-1 min-h-20 w-full rounded-md border p-2" placeholder="Ghi chú ảnh theo dõi" /></label><label className="text-xs font-medium">Tệp ảnh<input type="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" /></label><div className="flex items-end justify-end gap-2 md:col-span-3"><button type="button" onClick={() => setUploadOpen(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Hủy</button><button disabled={busy || !selectedVisit} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Đang tải…' : 'Lưu ảnh'}</button></div></form>}

    <div className="grid gap-4 xl:grid-cols-[minmax(260px,.65fr)_minmax(0,1.65fr)]">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Dòng thời gian</h2>
            <p className="mt-1 text-xs text-slate-500">{filteredImages.length} ảnh · mới nhất trước</p>
          </div>
          <CalendarDays size={16} className="text-slate-400" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-500">Vùng cơ thể
            <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="mt-1 w-full rounded-md border p-2">
              <option value="">Tất cả</option>
              {areas.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-500">Pha
            <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.target.value)} className="mt-1 w-full rounded-md border p-2">
              <option value="">Tất cả</option>
              {Object.entries(phaseLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-slate-500">Từ ngày
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1 w-full rounded-md border p-2" />
          </label>
          <label className="text-[11px] text-slate-500">Đến ngày
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="mt-1 w-full rounded-md border p-2" />
          </label>
        </div>
        <div className="mt-3 max-h-[680px] space-y-2 overflow-auto">
          {filteredImages.map((image) => {
            const slot = chosenBefore?.id === image.id ? 'before' : chosenAfter?.id === image.id ? 'after' : '';
            const imageLabel = image.description || image.imageType;
            const capturedAt = formatDate(image.capturedAt, true);
            return (
              <article key={image.id} className={`rounded-lg border p-2 ${selectedImage?.id === image.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                <button type="button" onClick={() => setSelectedImageId(image.id)} aria-pressed={selectedImage?.id === image.id} className="block w-full rounded-md text-left">
                  <div className="flex aspect-[16/8] items-center justify-center overflow-hidden rounded-md bg-slate-100">
                    {image.imageUrl ? <img src={image.imageUrl} alt={image.imageType} className="h-full w-full object-cover" /> : <Search size={18} className="text-slate-400" />}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-800">{capturedAt}</p>
                  <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">{phaseLabels[image.phase] ?? image.phase}</span>
                  <p className="mt-1 text-[11px] font-semibold">{imageLabel}</p>
                  <p className="mt-1 break-words text-[10px] text-slate-500">{image.plan?.name ?? 'Ảnh lượt khám'} · {image.session ? `Buổi ${image.session.sessionNo}` : image.visit.id}</p>
                </button>
                <select
                  aria-label={`Chọn ô so sánh cho ảnh ${imageLabel}, ${capturedAt}`}
                  value={slot}
                  onChange={(event) => chooseComparisonSlot(image.id, event.target.value)}
                  className={`mt-2 w-full rounded-md border px-2 py-1.5 text-xs font-medium ${slot ? 'border-blue-300 bg-blue-100 text-blue-800' : 'border-slate-200 bg-white text-slate-700'}`}
                >
                  <option value="">{slot ? 'Bỏ chọn ảnh này' : 'Chọn ô so sánh'}</option>
                  <option value="before">Trước điều trị</option>
                  <option value="after">Sau điều trị</option>
                </select>
              </article>
            );
          })}
          {loading && <p className="p-6 text-center text-xs text-slate-500">Đang tải ảnh…</p>}
          {!loading && filteredImages.length === 0 && <p className="rounded-lg border border-dashed p-7 text-center text-xs text-slate-500">Chưa có ảnh theo dõi trong bộ lọc này.</p>}
        </div>
      </section>

      <div className="space-y-4">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-bold">So sánh trước / sau</h2>
              <p className="mt-1 text-xs text-slate-500">{selectedPlan?.name ?? 'Ảnh lượt khám'}</p>
            </div>
            {(chosenBefore || chosenAfter) && (
              <button type="button" onClick={() => setComparisonChoices({})} className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                Dùng ảnh gợi ý
              </button>
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2" aria-live="polite">
            <ImageFrame image={beforeImage} label="Trước điều trị" manuallySelected={Boolean(chosenBefore)} />
            <ImageFrame image={afterImage} label="Sau điều trị" manuallySelected={Boolean(chosenAfter)} />
          </div>
        </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-bold">Mô tả ảnh đang chọn</h2><p className="mt-1 text-xs text-slate-500">{selectedImage ? `${phaseLabels[selectedImage.phase] ?? selectedImage.phase} · ${formatDate(selectedImage.capturedAt, true)} · ${selectedImage.plan?.name ?? 'Ảnh lượt khám'}` : 'Chọn ảnh trong dòng thời gian để xem mô tả.'}</p><label className="mt-3 block text-xs font-medium text-slate-600">Mô tả<textarea value={description} onChange={(event) => setDescription(event.target.value)} disabled={!selectedImage || !selectedImage.capturedById} maxLength={2000} className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm disabled:bg-slate-50" /></label><div className="mt-3 grid gap-3 text-xs sm:grid-cols-2"><p>Ngày chụp<br /><b>{selectedImage ? formatDate(selectedImage.capturedAt) : '—'}</b></p><p>Người chụp<br /><b>{selectedImage?.capturedBy?.fullName ?? '—'}</b></p><p>Pha<br /><b>{selectedImage ? phaseLabels[selectedImage.phase] ?? selectedImage.phase : '—'}</b></p><p>Vùng cơ thể<br /><b>{selectedImage?.bodyArea ?? '—'}</b></p><p>Loại ảnh<br /><b>{selectedImage?.imageType ?? '—'}</b></p><p>Liên kết<br /><b>{selectedImage?.session ? `Buổi ${selectedImage.session.sessionNo} · ${selectedImage.session.id}` : selectedImage?.plan?.name ?? selectedImage?.visitId ?? '—'}</b></p></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500"><ShieldCheck size={14} /> Ảnh gốc được giữ trong kho riêng tư; chỉ bác sĩ có Visit được phân công mới xem được.</p><button type="button" onClick={() => void saveDescription()} disabled={busy || !selectedImage || !selectedImage.capturedById} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><Save size={14} /> Lưu mô tả ảnh</button></div></section>
      </div>
    </div>
    {message && <p role="status" className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</p>}
  </main>;
}
