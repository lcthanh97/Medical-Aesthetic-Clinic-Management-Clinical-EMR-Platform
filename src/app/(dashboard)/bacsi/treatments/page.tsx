import Link from 'next/link';
import { Activity, AlertCircle, FileText, Pill, Stethoscope } from 'lucide-react';
import { TreatmentsPanel } from '@/features/treatments/components/TreatmentsPanel';
import { VisitSelector } from '@/features/treatments/components/VisitSelector';
import { getAssignedTreatmentVisits, getPlansByVisitId } from '@/features/treatments/actions';

type Props = { searchParams: Promise<{ visitId?: string | string[] }> };
type AssignedVisit = { id: string; visitDate: string; status: string; patient: { id: string; patientCode: string; fullName: string } };

export default async function BacSiTreatmentsPage({ searchParams }: Props) {
  const query = await searchParams;
  const requestedVisitId = typeof query.visitId === 'string' && query.visitId.length <= 100
    ? query.visitId
    : undefined;
  const visitResult = await getAssignedTreatmentVisits();
  const visits: AssignedVisit[] = visitResult.success ? visitResult.data : [];
  const selectedVisit = requestedVisitId ? visits.find((visit) => visit.id === requestedVisitId) : undefined;
  const plansResult = selectedVisit ? await getPlansByVisitId(selectedVisit.id) : null;
  const plans = plansResult?.success ? plansResult.data : [];
  const accessUnavailable = !visitResult.success;
  const invalidVisit = Boolean(requestedVisitId && !selectedVisit);

  return (
    <main className="space-y-5">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            <Stethoscope size={14} /> Phân hệ Bác sĩ Điều trị
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Phác đồ điều trị bệnh nhân</h1>
          <p className="mt-1 text-sm text-slate-600">Theo dõi kế hoạch, giai đoạn, bước và buổi điều trị trong Visit được phân công.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bacsi/treatment-sessions${requestedVisitId ? `?visitId=${encodeURIComponent(requestedVisitId)}` : ''}`} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
            <Activity size={15} /> Buổi điều trị
          </Link>
          <Link href={`/bacsi/consents${requestedVisitId ? `?visitId=${encodeURIComponent(requestedVisitId)}` : ''}`} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
            <FileText size={15} /> Cam kết điều trị
          </Link>
          <Link href="/bacsi/protocol-library" className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
            <FileText size={15} /> Thư viện phác đồ chuẩn
          </Link>
          <button type="button" disabled title="Chưa có quy trình áp dụng phác đồ chuẩn được xác minh" className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-500 opacity-60">
            <FileText size={15} /> Tạo từ phác đồ chuẩn
          </button>
          <button type="button" disabled title="Chưa có quyền TREATMENT_WRITE được xác minh" className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white opacity-50">
            Cập nhật phiên bản
          </button>
        </div>
      </header>

      {accessUnavailable ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div><p className="font-semibold">Không thể tải phác đồ trong phạm vi được phép.</p><p className="mt-1">Cần session hợp lệ, quyền EMR_READ và TREATMENT_READ cùng role, cùng Visit được phân công.</p></div>
        </div>
      ) : (
        <>
          <VisitSelector visits={visits} currentVisitId={selectedVisit?.id ?? ''} />

          {invalidVisit && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Visit không nằm trong phạm vi được phân công hoặc không thể truy cập.</div>}

          {!selectedVisit && !invalidVisit ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <Activity className="mx-auto text-slate-400" size={28} />
              <h2 className="mt-3 font-semibold text-slate-800">Chọn Visit được phân công</h2>
              <p className="mt-1 text-sm text-slate-600">Danh sách chỉ gồm Visit gắn với nhân viên đang đăng nhập.</p>
              {!visits.length && <p className="mt-2 text-sm text-slate-500">Không có Visit nào trong phạm vi được phép.</p>}
            </div>
          ) : selectedVisit ? (
            <>
              <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 sm:items-center">
                <div><p className="text-xs text-slate-500">Bệnh nhân</p><p className="font-semibold text-slate-900">{selectedVisit.patient.fullName}</p><p className="text-xs text-slate-500">{selectedVisit.patient.patientCode}</p></div>
                <div><p className="text-xs text-slate-500">Lượt khám</p><p className="text-sm font-medium text-slate-800">{selectedVisit.id}</p><p className="text-xs text-slate-500">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selectedVisit.visitDate))}</p></div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{selectedVisit.status}</span>
                  <Link href={`/bacsi/emr?patientId=${encodeURIComponent(selectedVisit.patient.id)}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><FileText size={14} /> Hồ sơ</Link>
                  <Link href={`/bacsi/examination?visitId=${encodeURIComponent(selectedVisit.id)}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Stethoscope size={14} /> Khám bệnh</Link>
                  <Link href={`/bacsi/prescriptions?visitId=${encodeURIComponent(selectedVisit.id)}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Pill size={14} /> Kê đơn</Link>
                  <Link href={`/bacsi/images?patientId=${encodeURIComponent(selectedVisit.patient.id)}`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Activity size={14} /> Ảnh theo dõi</Link>
                </div>
              </section>

              {plansResult && !plansResult.success ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Không thể tải phác đồ hiện tại.</div>
              ) : (
                <TreatmentsPanel initialPlans={plans} visitId={selectedVisit.id} readOnly />
              )}
            </>
          ) : null}
        </>
      )}
    </main>
  );
}
