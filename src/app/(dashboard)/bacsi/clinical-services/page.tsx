import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { ClinicalExaminationPanel } from '@/features/emr/components/ClinicalExaminationPanel';
import { getAssignedClinicalExamination, getAssignedExaminationVisits } from '@/features/emr/examination-actions';

type SearchParams = Promise<{ visitId?: string; date?: string }>;

export default async function BacSiClinicalServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const day = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
    ? params.date
    : new Date().toISOString().slice(0, 10);
  const queue = await getAssignedExaminationVisits(day);
  const visits = queue.success ? queue.data : [];
  const requestedId = params.visitId?.trim();
  const selectedId = requestedId
    ? requestedId
    : (visits.find((visit) => ['IN_PROGRESS', 'EXAMINING'].includes(visit.status)) ?? visits[0])?.id;
  const selected = selectedId ? await getAssignedClinicalExamination(selectedId, day) : null;

  return (
    <main className="space-y-5 pb-8">
      <header>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          <Stethoscope size={14} /> Khu vực bác sĩ
        </span>
        <h1 className="text-2xl font-bold text-slate-900">Khám và chỉ định</h1>
        <p className="mt-1 text-sm text-slate-500">Khám bệnh, ghi nhận bệnh án và tạo chỉ định cho lượt khám được phân công.</p>
      </header>

      {selected?.success ? (
        <ClinicalExaminationPanel visit={selected.data} visits={visits} day={day} />
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-900">Chọn lượt khám để bắt đầu</h2>
          <p className="mt-1 text-sm text-slate-600">
            {queue.success
              ? selectedId
                ? selected?.error ?? 'Không thể tải lượt khám được chọn.'
                : `Chưa có lượt khám được phân công ngày ${day}.`
              : queue.error}
          </p>
          <form action="/bacsi/clinical-services" method="get" className="mt-4 flex max-w-md items-end gap-2">
            <label className="flex-1 text-sm font-medium text-slate-700">Ngày khám
              <input type="date" name="date" defaultValue={day} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5" />
            </label>
            <button className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold">Xem</button>
          </form>
          <Link href={`/bacsi/queue?date=${encodeURIComponent(day)}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
            Mở hàng đợi khám <ArrowRight size={16} />
          </Link>
        </section>
      )}

    </main>
  );
}
