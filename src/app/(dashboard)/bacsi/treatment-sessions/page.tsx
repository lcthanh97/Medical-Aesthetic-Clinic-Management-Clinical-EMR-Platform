import { AlertCircle, Stethoscope } from 'lucide-react';
import { TreatmentSessionsPanel } from '@/features/treatments/components/TreatmentSessionsPanel';
import { getTreatmentSessions } from '@/features/treatments/actions';

type Props = { searchParams: Promise<{ visitId?: string | string[] }> };

export default async function TreatmentSessionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const visitId = typeof params.visitId === 'string' && params.visitId.length <= 100 ? params.visitId : '';
  const result = await getTreatmentSessions({ visitId: visitId || undefined });

  return (
    <main className="space-y-5">
      <header>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"><Stethoscope size={14} /> Phân hệ Bác sĩ điều trị</span>
        <h1 className="text-2xl font-bold text-slate-900">Buổi điều trị</h1>
        <p className="mt-1 text-sm text-slate-600">Theo dõi thông tin đã ghi nhận trong các buổi thuộc Visit được phân công. Danh sách giới hạn 100 buổi gần nhất; lọc ngày theo UTC.</p>
      </header>
      {!result.success ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">Không thể tải buổi điều trị trong phạm vi được phép.</p><p className="mt-1">Cần session hợp lệ, EMR_READ và TREATMENT_READ cùng role; Visit phải được phân công cho nhân viên đang đăng nhập.</p></div></div>
      ) : <TreatmentSessionsPanel initialData={result.data} initialVisitId={visitId} />}
    </main>
  );
}
