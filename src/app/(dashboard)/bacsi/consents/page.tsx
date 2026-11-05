import Link from 'next/link';
import { ClipboardCheck, Stethoscope } from 'lucide-react';
import { ConsentsPanel } from '@/features/consents/components/ConsentsPanel';
import { getDoctorTreatmentConsents } from '@/features/consents/actions';

type Props = { searchParams: Promise<{ visitId?: string | string[] }> };

export default async function BacSiConsentsPage({ searchParams }: Props) {
  const query = await searchParams;
  const visitId = typeof query.visitId === 'string' && query.visitId.length <= 100 ? query.visitId : '';
  const result = await getDoctorTreatmentConsents(visitId ? { visitId } : {});

  return (
    <main className="mx-auto max-w-[1440px] space-y-5 pb-8">
      <header>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          <Stethoscope size={14} /> Phân hệ Bác sĩ
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Cam kết điều trị</h1>
        <p className="mt-1 text-sm text-slate-600">Cam kết đã ghi nhận trong Visit được phân công. Thao tác ký và tài liệu riêng tư vẫn được bảo vệ.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Link href={`/bacsi/treatments${visitId ? `?visitId=${encodeURIComponent(visitId)}` : ''}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700">Phác đồ điều trị</Link>
        <Link href={`/bacsi/treatment-sessions${visitId ? `?visitId=${encodeURIComponent(visitId)}` : ''}`} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700">Buổi điều trị</Link>
      </div>
      <ConsentsPanel
        initialData={result.success ? result.data : null}
        initialError={result.success ? '' : result.error}
        initialVisitId={visitId}
      />
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
        <ClipboardCheck size={16} className="mt-0.5 shrink-0" />
        <p>Danh sách chỉ hiển thị bản ghi có ngày ký được lưu trong schema. Hệ thống hiện không có trạng thái/workflow ký hoặc snapshot nội dung đã ký.</p>
      </div>
    </main>
  );
}
