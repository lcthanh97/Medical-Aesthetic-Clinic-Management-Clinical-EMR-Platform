import Link from 'next/link';
import { ArrowLeft, BookOpen, CheckCircle2, Layers3 } from 'lucide-react';
import { ProtocolTemplateApplyButton } from '@/features/treatments/components/ProtocolTemplateApplyButton';
import { prisma } from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';

export const dynamic = 'force-dynamic';

export default async function DoctorProtocolsPage({
  searchParams,
}: {
  searchParams: Promise<{ visitId?: string }>;
}) {
  const session = await getDoctorSession();
  if (!session) return null;
  const { visitId } = await searchParams;

  const [protocols, visit] = await Promise.all([
    prisma.treatmentProtocolTemplate.findMany({
      include: {
        createdBy: { select: { fullName: true } },
        stages: {
          include: { steps: { orderBy: { orderNo: 'asc' } } },
          orderBy: { orderNo: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    visitId
      ? prisma.visit.findFirst({
          where: { id: visitId, employeeId: session.employeeId },
          include: { patient: { select: { fullName: true, patientCode: true } } },
        })
      : Promise.resolve(null),
  ]);

  return (
    <main className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-0.03em] text-[#1d3049]">Thư viện phác đồ chuẩn</h1>
          <p className="mt-1 text-[11px] text-[#75869d]">Mẫu chuyên khoa được kiểm soát phiên bản trước khi áp dụng cho bệnh nhân.</p>
        </div>
        {visit && <Link href={`/bacsi/treatments?visitId=${encodeURIComponent(visit.id)}`} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d7e1ed] bg-white px-3 text-[11px] font-semibold text-[#3b5b7c] hover:bg-[#f7faff]">
          <ArrowLeft size={14} /> Quay lại phác đồ điều trị
        </Link>}
      </header>

      {visit ? <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#dfe7f0] bg-white px-4 py-3 text-[11px]">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f0ff] text-[#2b68c0]"><BookOpen size={16} /></span>
        <div><p className="font-bold text-[#253a55]">Áp dụng mẫu cho {visit.patient.fullName}</p><p className="mt-0.5 text-[10px] text-[#74869e]">{visit.patient.patientCode} · Lượt khám {visit.id.slice(-12).toUpperCase()}</p></div>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#e8f7ef] px-2.5 py-1 text-[10px] font-semibold text-[#16834a]"><CheckCircle2 size={12} /> Lượt khám được phân công</span>
      </div> : <div className="rounded-lg border border-[#dfe7f0] bg-white px-4 py-3 text-[11px] text-[#667a92]">
        Để áp dụng phác đồ chuẩn cho bệnh nhân, hãy quay lại trang điều trị, chọn lượt khám rồi mở thư viện từ lượt khám đó.
      </div>}

      {protocols.length ? <div className="grid gap-4 xl:grid-cols-2">
        {protocols.map((protocol) => <article key={protocol.id} className="rounded-[10px] border border-[#dfe7f0] bg-white p-4 shadow-[0_1px_2px_rgba(24,50,82,0.03)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6f849e]">{protocol.code} · v{protocol.version}</p>
              <h2 className="mt-1 text-[15px] font-bold text-[#243952]">{protocol.name}</h2>
              <p className="mt-1 text-[10px] text-[#8291a5]">Tạo bởi BS. {protocol.createdBy.fullName}</p>
            </div>
            <span className="rounded-full bg-[#e8f7ef] px-2.5 py-1 text-[10px] font-semibold text-[#16834a]">{protocol.status}</span>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-[#526984]">{protocol.description || protocol.indication || 'Chưa có mô tả cho mẫu này.'}</p>
          {protocol.contraindication && <p className="mt-2 rounded-md bg-[#fff7e7] px-3 py-2 text-[10px] leading-4 text-[#8c570b]">Lưu ý: {protocol.contraindication}</p>}

          <div className="mt-4 space-y-2.5">
            {protocol.stages.map((stage) => <section key={stage.id} className="overflow-hidden rounded-md border border-[#e2e9f1]">
              <div className="flex items-center gap-2 bg-[#f5f8fc] px-3 py-2">
                <Layers3 size={13} className="text-[#537cae]" />
                <h3 className="text-[11px] font-bold text-[#344d69]">Giai đoạn {stage.orderNo} · {stage.name}</h3>
                {stage.durationDays && <span className="ml-auto text-[10px] text-[#7b8da3]">{stage.durationDays} ngày</span>}
              </div>
              {stage.goal && <p className="border-t border-[#e5ebf3] px-3 py-2 text-[10px] text-[#61758e]">Mục tiêu: {stage.goal}</p>}
              <div className="divide-y divide-[#e8edf4]">
                {stage.steps.map((step) => <div key={step.id} className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-2 px-3 py-2 text-[10px]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#edf4ff] font-bold text-[#3a72bd]">{step.orderNo}</span>
                  <span className="leading-4 text-[#405873]">{step.instruction}</span>
                  <span className="text-right text-[#7b8da3]">{step.repeatCount} lần{step.intervalDays ? ` · mỗi ${step.intervalDays} ngày` : ''}{step.plannedDurationMinutes ? ` · ${step.plannedDurationMinutes} phút` : ''}</span>
                </div>)}
                {stage.steps.length === 0 && <p className="px-3 py-3 text-[10px] text-[#8291a5]">Giai đoạn chưa có bước điều trị.</p>}
              </div>
            </section>)}
          </div>

          {visit && <ProtocolTemplateApplyButton templateId={protocol.id} visitId={visit.id} />}
        </article>)}
      </div> : <div className="rounded-lg border border-dashed border-[#d3dfed] bg-white px-5 py-12 text-center text-[12px] text-[#74869d]">Chưa có phác đồ chuẩn trong thư viện.</div>}
    </main>
  );
}
