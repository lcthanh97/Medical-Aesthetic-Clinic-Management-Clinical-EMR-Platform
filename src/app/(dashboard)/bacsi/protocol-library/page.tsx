import Link from 'next/link';
import { ArrowLeft, BookOpenCheck, Stethoscope } from 'lucide-react';
import { ProtocolTemplateLibraryPanel } from '@/features/treatments/components/ProtocolTemplateLibraryPanel';
import { getTreatmentProtocolTemplates } from '@/features/treatments/actions';

export default async function ProtocolLibraryPage() {
  const result = await getTreatmentProtocolTemplates({});

  return (
    <main className="mx-auto max-w-[1440px] space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Phân hệ Bác sĩ</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thư viện phác đồ chuẩn</h1>
          <p className="mt-1 text-sm text-slate-600">Tra cứu các mẫu, phiên bản, giai đoạn và bước đã lưu trong hệ thống.</p>
        </div>
        <Link href="/bacsi/treatments" className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><ArrowLeft size={15} /> Phác đồ bệnh nhân</Link>
      </header>
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900"><BookOpenCheck size={16} className="mt-0.5 shrink-0" /><p>Quyền đọc yêu cầu session hợp lệ và cặp quyền <code>EMR_READ</code> + <code>TREATMENT_READ</code> trên cùng một role theo chính sách Treatment hiện tại.</p></div>
      <ProtocolTemplateLibraryPanel
        initialData={result.success ? result.data : null}
        initialError={result.success ? '' : result.error}
      />
    </main>
  );
}
