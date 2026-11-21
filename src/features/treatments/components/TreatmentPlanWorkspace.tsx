'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Layers3,
  Pause,
  Play,
  RefreshCw,
  UserRound,
} from 'lucide-react';
import { updatePlan } from '../actions';

type VisitView = {
  id: string;
  visitDate: string | Date;
  patient: {
    id: string;
    patientCode: string;
    fullName: string;
    dateOfBirth: string | Date | null;
    phone: string | null;
  };
  employee?: { fullName: string } | null;
};

type StepView = {
  id: string;
  orderNo: number;
  content: string;
  repeatCount: number;
  intervalDays: number | null;
  plannedDurationMinutes: number | null;
  status: string;
};

type SessionView = {
  id: string;
  sessionNo: number;
  scheduledAt: string | Date | null;
  completedAt: string | Date | null;
  status: string;
  performedBy?: { fullName: string } | null;
  step?: { orderNo: number } | null;
};

type StageView = {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  plannedStartDate: string | Date | null;
  plannedEndDate: string | Date | null;
  steps: StepView[];
  sessions: SessionView[];
};

type PlanView = {
  id: string;
  name: string;
  status: string;
  version: number;
  diagnosisSummary: string | null;
  goal: string | null;
  startDate: string | Date | null;
  expectedEndDate: string | Date | null;
  completedAt: string | Date | null;
  notes: string | null;
  updatedAt: string | Date;
  createdBy?: { fullName: string };
  protocolTemplate?: { code: string; version: number } | null;
  stages: StageView[];
  consents: { planVersion: number | null; signedAt: string | Date }[];
};

const dateText = (value?: string | Date | null, withTime = false) => {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
};

const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const isCompleted = (value: string) => normalized(value).includes('hoan thanh') || normalized(value).includes('completed');
const isPaused = (value: string) => normalized(value).includes('tam ngung') || normalized(value).includes('paused');
const isDraft = (value: string) => ['draft', 'pending', 'len ke hoach'].includes(normalized(value));
const isStagePending = (value: string) => ['pending', 'len ke hoach', 'chua bat dau'].includes(normalized(value));
const isStageActive = (value: string) => ['active', 'in_progress', 'dang thuc hien'].includes(normalized(value));

function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'slate' }) {
  const tones = {
    blue: 'bg-[#e8f1ff] text-[#2361b8]',
    green: 'bg-[#e8f7ef] text-[#16834a]',
    amber: 'bg-[#fff5df] text-[#a96500]',
    slate: 'bg-[#f0f3f7] text-[#687a91]',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${tones[tone]}`}>{children}</span>;
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[10px] border border-[#dfe7f0] bg-white shadow-[0_1px_2px_rgba(24,50,82,0.03)] ${className}`}>{children}</section>;
}

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return <div className="min-w-0"><p className="text-[10px] text-[#7d8ea4]">{label}</p><div className="mt-1 truncate text-[11px] font-semibold text-[#253a55]">{value || '—'}</div></div>;
}

export function TreatmentPlanWorkspace({
  visits,
  currentVisitId,
  plans,
  doctorName,
}: {
  visits: VisitView[];
  currentVisitId: string;
  plans: PlanView[];
  doctorName: string;
}) {
  const router = useRouter();
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visit = visits.find((item) => item.id === currentVisitId);
  const plan = plans.find((item) => !isCompleted(item.status)) ?? plans[0];
  const stages = plan?.stages ?? [];
  const activeStage = stages.find((stage) => stage.id === selectedStageId) ?? stages.find((stage) => !isCompleted(stage.status)) ?? stages[0];
  const completedSessions = activeStage?.sessions.filter((session) => session.completedAt || isCompleted(session.status)).length ?? 0;
  const plannedSessions = activeStage?.steps.reduce((sum, step) => sum + Math.max(step.repeatCount, 0), 0) ?? 0;
  const signedForCurrentVersion = plan?.consents.some((consent) => consent.planVersion === plan.version) ?? false;
  const nextSession = useMemo(() => stages.flatMap((stage) => stage.sessions)
    .filter((session) => !session.completedAt && session.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0], [stages]);
  const age = visit?.patient.dateOfBirth
    ? Math.max(0, new Date().getFullYear() - new Date(visit.patient.dateOfBirth).getFullYear())
    : null;
  const paused = plan ? isPaused(plan.status) : false;
  const planTone = plan ? (paused || isDraft(plan.status) ? 'amber' : isCompleted(plan.status) ? 'slate' : 'green') : 'slate';

  const openManagement = () => {
    const details = document.getElementById('plan-management') as HTMLDetailsElement | null;
    if (!details) return;
    details.open = true;
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const changeStatus = () => {
    if (!plan) return;
    startTransition(async () => {
      const result = await updatePlan(plan.id, { status: paused ? 'Đang thực hiện' : 'Tạm ngưng' });
      if (result.success) router.refresh();
      else window.alert(result.error ?? 'Không thể cập nhật trạng thái phác đồ.');
    });
  };

  return (
    <div className="space-y-4 text-[#20334b]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-bold tracking-[-0.03em] text-[#1d3049]">Phác đồ điều trị bệnh nhân</h1>
          <p className="mt-1 text-[11px] text-[#75869d]">
            {plan ? `${plan.name} · Phiên bản v${plan.version} · Kế hoạch theo dõi riêng` : 'Theo dõi kế hoạch và thực hiện điều trị'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={currentVisitId ? `/bacsi/protocols?visitId=${encodeURIComponent(currentVisitId)}` : '/bacsi/protocols'} className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d7e1ed] bg-white px-3 text-[11px] font-semibold text-[#3b5b7c] hover:bg-[#f7faff]">
            <FileText size={14} /> Tạo từ phác đồ chuẩn
          </Link>
          <button type="button" onClick={openManagement} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#2864c8] px-3 text-[11px] font-semibold text-white shadow-sm hover:bg-[#1f55ad]">
            <RefreshCw size={14} /> Cập nhật phiên bản
          </button>
        </div>
      </div>

      {visit && (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3.5">
          <div className="flex min-w-[190px] flex-1 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e6f0ff] text-[12px] font-bold text-[#2b68c0]">
              {visit.patient.fullName.split(' ').slice(-2).map((part) => part[0]).join('').toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold">{visit.patient.fullName}</p>
              <p className="mt-0.5 text-[10px] text-[#74869e]">{visit.patient.patientCode} · {age !== null ? `${age} tuổi` : 'Chưa cập nhật tuổi'}{visit.patient.dateOfBirth ? ` · ${dateText(visit.patient.dateOfBirth)}` : ''}</p>
            </div>
          </div>
          <InfoField label="Lượt khám" value={visit.id.slice(-12).toUpperCase()} />
          <InfoField label="Thời điểm khám" value={dateText(visit.visitDate, true)} />
          <div className="min-w-[180px]">
            <label htmlFor="treatment-visit" className="mb-1 block text-[10px] text-[#7d8ea4]">Chọn bệnh nhân / lượt khám</label>
            <div className="relative">
              <select id="treatment-visit" value={currentVisitId} onChange={(event) => router.push(`/bacsi/treatments?visitId=${event.target.value}`)} className="w-full appearance-none rounded-md border border-[#dce5f0] bg-white py-1.5 pl-2.5 pr-7 text-[10px] font-semibold text-[#2c4665] outline-none focus:border-[#6b9ce0]">
                {visits.map((item) => <option key={item.id} value={item.id}>{item.patient.fullName} · {dateText(item.visitDate)}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#70839b]" />
            </div>
          </div>
        </Card>
      )}

      {!visit && <Card className="p-5 text-sm text-[#657992]">Chưa có lượt khám được phân công để hiển thị phác đồ.</Card>}

      {plan ? (
        <>
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold">{plan.name}</p>
                <p className="mt-0.5 text-[10px] text-[#7d8ea4]">{plan.protocolTemplate ? `Nguồn: ${plan.protocolTemplate.code} · v${plan.protocolTemplate.version}` : 'Phác đồ được cá thể hóa theo đánh giá bác sĩ'}</p>
              </div>
              <Badge tone={planTone}>{plan.status} · v{plan.version}</Badge>
            </div>
            <div className="mt-4 grid gap-x-5 gap-y-3 border-b border-[#e4ebf3] pb-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label="Chẩn đoán tóm tắt" value={plan.diagnosisSummary || 'Chưa cập nhật chẩn đoán'} />
              <InfoField label="Mục tiêu điều trị" value={plan.goal || 'Theo dõi đáp ứng theo đánh giá'} />
              <InfoField label="Người tạo" value={plan.createdBy?.fullName || doctorName} />
              <InfoField label="Ngày bắt đầu" value={dateText(plan.startDate)} />
              <InfoField label="Dự kiến kết thúc" value={dateText(plan.expectedEndDate)} />
              <InfoField label="Ngày hoàn tất" value={dateText(plan.completedAt)} />
            </div>
            <p className="mt-3 text-[10px] leading-5 text-[#6e819a]">Ghi chú: {plan.notes || (plan.updatedAt ? `Cập nhật gần nhất ${dateText(plan.updatedAt, true)}.` : 'Chưa có ghi chú cập nhật.')}</p>
          </Card>

          {!signedForCurrentVersion && <div className="flex items-start gap-2 rounded-lg border border-[#f1dfb7] bg-[#fff7e7] px-3 py-2.5 text-[10px] leading-4 text-[#8c570b]">
            <ClipboardList size={15} className="mt-0.5 shrink-0" />
            <div className="flex-1"><strong>Cam kết phiên bản v{plan.version} chưa được ghi nhận</strong><p className="mt-0.5">Kiểm tra và ký cam kết đúng phiên bản trước khi hoàn tất buổi điều trị.</p></div>
            <Link href="/bacsi/consents" className="shrink-0 font-bold underline underline-offset-2">Mở cam kết</Link>
          </div>}

          <div className="grid gap-3 md:grid-cols-3">
            {stages.map((stage, index) => {
              const done = stage.sessions.filter((session) => session.completedAt || isCompleted(session.status)).length;
              const total = Math.max(stage.sessions.length, stage.steps.reduce((sum, step) => sum + step.repeatCount, 0));
              const isActive = stage.id === activeStage?.id;
              const stageTone = isCompleted(stage.status) ? 'green' : isPaused(stage.status) ? 'amber' : isStageActive(stage.status) ? 'blue' : 'slate';
              const stageLabel = isCompleted(stage.status) ? 'Hoàn tất' : isPaused(stage.status) ? 'Tạm ngưng' : isStageActive(stage.status) ? 'Đang thực hiện' : isStagePending(stage.status) ? 'Chưa bắt đầu' : stage.status;
              return <button key={stage.id} type="button" onClick={() => setSelectedStageId(stage.id)} className={`min-h-[112px] rounded-lg border bg-white p-3 text-left transition hover:border-[#8bb4ea] ${isActive ? 'border-[#3579d5] ring-1 ring-[#b9d4f5]' : 'border-[#dfe7f0]'}`}>
                <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-bold">{stage.name}</span><Badge tone={stageTone}>{stageLabel || 'Chưa bắt đầu'}</Badge></div>
                <p className="mt-1 text-[10px] font-semibold text-[#526983]">{stage.goal || `Giai đoạn ${index + 1}`}</p>
                <p className="mt-1 text-[10px] text-[#8191a6]">{dateText(stage.plannedStartDate)} – {dateText(stage.plannedEndDate)}</p>
                <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-[#3d5a79]"><span>{done} / {total} buổi hoàn tất</span><span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#e8eef6]"><span className="block h-full rounded-full bg-[#4d8be0]" style={{ width: `${total ? Math.min(100, (done / total) * 100) : 0}%` }} /></span></div>
              </button>;
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <Card className="overflow-hidden">
              {activeStage ? <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4ebf3] px-4 py-3.5">
                  <div><p className="text-[14px] font-bold">{isDraft(plan.status) || isStagePending(activeStage.status) ? 'Giai đoạn được chọn' : 'Giai đoạn hiện tại'} · {activeStage.name}</p><p className="mt-0.5 text-[10px] text-[#7d8ea4]">Giai đoạn {stages.indexOf(activeStage) + 1} trong {stages.length} · Các bước dự kiến</p></div>
                  <button type="button" onClick={openManagement} className="rounded-md border border-[#d7e2ef] px-3 py-2 text-[10px] font-semibold text-[#3569ad] hover:bg-[#f5f9ff]">Cập nhật giai đoạn</button>
                </div>
                <div className="grid gap-3 border-b border-[#e4ebf3] px-4 py-3 sm:grid-cols-2">
                  <InfoField label="Bắt đầu thực tế" value={dateText(activeStage.plannedStartDate)} />
                  <InfoField label="Kết thúc dự kiến" value={dateText(activeStage.plannedEndDate)} />
                </div>
                <div className="px-4 py-3">
                  <p className="mb-2 text-[10px] font-bold">Các bước dự kiến</p>
                  <div className="overflow-x-auto rounded-md border border-[#dfe7f0]"><table className="w-full min-w-[530px] text-left text-[10px]"><thead className="bg-[#f5f8fc] text-[#71839a]"><tr><th className="px-2.5 py-2 font-semibold">Thứ tự / Nội dung</th><th className="px-2.5 py-2 font-semibold">Lặp lại</th><th className="px-2.5 py-2 font-semibold">Khoảng cách</th><th className="px-2.5 py-2 font-semibold">Thời lượng</th></tr></thead><tbody>{activeStage.steps.length ? activeStage.steps.map((step) => <tr key={step.id} className="border-t border-[#e5ebf3]"><td className="px-2.5 py-2.5 font-medium text-[#344c68]">{step.orderNo}. {step.content}</td><td className="px-2.5 py-2.5 text-[#61758f]">{step.repeatCount} lần</td><td className="px-2.5 py-2.5 text-[#61758f]">{step.intervalDays ? `${step.intervalDays} ngày` : '—'}</td><td className="px-2.5 py-2.5 text-[#61758f]">{step.plannedDurationMinutes ? `${step.plannedDurationMinutes} phút` : '—'}</td></tr>) : <tr><td colSpan={4} className="px-3 py-6 text-center text-[#8291a5]">Chưa có bước điều trị trong giai đoạn này.</td></tr>}</tbody></table></div>
                </div>
                <div className="px-4 pb-4">
                  <p className="mb-2 text-[10px] font-bold">Buổi điều trị thực tế / Đã xếp lịch</p>
                  <div className="overflow-x-auto rounded-md border border-[#dfe7f0]"><table className="w-full min-w-[500px] text-left text-[10px]"><thead className="bg-[#f5f8fc] text-[#71839a]"><tr><th className="px-2.5 py-2 font-semibold">Buổi / Thời gian</th><th className="px-2.5 py-2 font-semibold">Liên kết bước</th><th className="px-2.5 py-2 font-semibold">Người thực hiện</th><th className="px-2.5 py-2 font-semibold">Trạng thái</th></tr></thead><tbody>{activeStage.sessions.length ? activeStage.sessions.map((session) => <tr key={session.id} className="border-t border-[#e5ebf3]"><td className="px-2.5 py-2.5">Buổi {session.sessionNo} · {dateText(session.scheduledAt, true)}</td><td className="px-2.5 py-2.5">{session.step ? `Bước ${session.step.orderNo}` : 'Chưa liên kết'}</td><td className="px-2.5 py-2.5">{session.performedBy?.fullName || 'Chưa phân công'}</td><td className="px-2.5 py-2.5"><Badge tone={session.completedAt || isCompleted(session.status) ? 'green' : 'blue'}>{session.completedAt || isCompleted(session.status) ? 'Hoàn tất' : session.status || 'Đã xếp lịch'}</Badge></td></tr>) : <tr><td colSpan={4} className="px-3 py-6 text-center text-[#8291a5]">Chưa có buổi điều trị nào được xếp lịch.</td></tr>}</tbody></table></div>
                </div>
              </> : <div className="p-6 text-sm text-[#74869d]">Phác đồ chưa có giai đoạn điều trị.</div>}
            </Card>

            <div className="space-y-3">
              <Card className="p-4">
                <h2 className="text-[13px] font-bold">Thông tin phác đồ hiện tại</h2>
                <p className="mt-1 text-[10px] text-[#8090a5]">Lịch sử phiên bản và người cập nhật</p>
                <div className="mt-3"><Badge tone={planTone}>v{plan.version} · {plan.status}</Badge></div>
                <div className="mt-3 space-y-2.5 border-t border-[#e5ebf3] pt-3 text-[10px]">
                  <div><p className="text-[#8291a5]">Cập nhật gần nhất</p><p className="mt-1 font-semibold">{dateText(plan.updatedAt, true)}</p></div>
                  <div><p className="text-[#8291a5]">Người tạo</p><p className="mt-1 font-semibold">{plan.createdBy?.fullName || doctorName}</p></div>
                  <div><p className="text-[#8291a5]">Ghi chú</p><p className="mt-1 font-semibold">{plan.goal || 'Đánh giá lại trước mỗi buổi.'}</p></div>
                </div>
              </Card>
              <Card className="p-4">
                <h2 className="text-[13px] font-bold">Điều phối điều trị</h2>
                <div className="mt-3 flex items-start gap-2 text-[10px]"><CalendarDays size={14} className="mt-0.5 text-[#6483a9]" /><div><p className="text-[#8291a5]">Buổi tiếp theo</p><p className="mt-1 font-semibold">{nextSession ? `Buổi ${nextSession.sessionNo} · ${dateText(nextSession.scheduledAt, true)}` : 'Chưa xếp lịch'}</p></div></div>
                <Link href="/bacsi/sessions" className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md bg-[#2864c8] text-[10px] font-bold text-white hover:bg-[#1f55ad]"><ArrowRight size={14} /> Mở buổi điều trị</Link>
                <button type="button" onClick={changeStatus} disabled={isPending || isCompleted(plan.status) || isDraft(plan.status)} className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[#dce5ef] text-[10px] font-semibold text-[#415b78] hover:bg-[#f6f9fc] disabled:cursor-not-allowed disabled:opacity-50">
                  {paused ? <Play size={13} /> : <Pause size={13} />}{isPending ? 'Đang cập nhật...' : paused ? 'Tiếp tục phác đồ' : 'Tạm ngưng phác đồ'}
                </button>
                <p className="mt-3 text-[9px] leading-4 text-[#8694a8]">Giai đoạn mới nên được bắt đầu sau khi đánh giá và kết thúc giai đoạn hiện tại.</p>
              </Card>
            </div>
          </div>
        </>
      ) : <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#edf4ff] text-[#3977c7]"><Layers3 size={17} /></span><div><h2 className="text-[14px] font-bold">Chưa có phác đồ điều trị</h2><p className="mt-0.5 text-[10px] text-[#7d8ea4]">Lượt khám này chưa được áp dụng phác đồ chuẩn.</p></div></div>
            <Badge tone="amber">Chưa thiết lập</Badge>
          </div>
          <div className="mt-4 grid gap-x-5 gap-y-3 border-t border-[#e4ebf3] pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Chẩn đoán tóm tắt" value="Chưa có dữ liệu phác đồ" />
            <InfoField label="Mục tiêu điều trị" value="Chưa thiết lập" />
            <InfoField label="Người tạo" value="—" />
            <InfoField label="Ngày bắt đầu" value="—" />
            <InfoField label="Dự kiến kết thúc" value="—" />
            <InfoField label="Ngày hoàn tất" value="—" />
          </div>
        </Card>

        <div className="flex items-start gap-2 rounded-lg border border-[#f1dfb7] bg-[#fff7e7] px-3 py-2.5 text-[10px] leading-4 text-[#8c570b]">
          <ClipboardList size={15} className="mt-0.5 shrink-0" />
          <div><strong>Chưa có kế hoạch để theo dõi tiến độ</strong><p className="mt-0.5">Chọn phác đồ chuẩn để tạo các giai đoạn và bước điều trị cho lượt khám này.</p></div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[1, 2, 3].map((number) => <Card key={number} className="min-h-[104px] p-3">
            <div className="flex items-center justify-between"><span className="text-[12px] font-bold">Giai đoạn {number}</span><Badge>Chưa thiết lập</Badge></div>
            <p className="mt-2 text-[10px] text-[#8291a5]">Nội dung giai đoạn sẽ xuất hiện sau khi áp dụng phác đồ.</p>
            <div className="mt-3 h-1.5 rounded-full bg-[#edf1f6]" />
          </Card>)}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <Card className="overflow-hidden">
            <div className="border-b border-[#e4ebf3] px-4 py-3.5"><p className="text-[14px] font-bold">Giai đoạn hiện tại</p><p className="mt-0.5 text-[10px] text-[#7d8ea4]">Chưa có các bước điều trị được thiết lập.</p></div>
            <div className="p-4"><div className="overflow-x-auto rounded-md border border-[#dfe7f0]"><table className="w-full min-w-[480px] text-left text-[10px]"><thead className="bg-[#f5f8fc] text-[#71839a]"><tr><th className="px-2.5 py-2 font-semibold">Thứ tự / Nội dung</th><th className="px-2.5 py-2 font-semibold">Lặp lại</th><th className="px-2.5 py-2 font-semibold">Khoảng cách</th><th className="px-2.5 py-2 font-semibold">Thời lượng</th></tr></thead><tbody><tr><td colSpan={4} className="px-3 py-8 text-center text-[#8291a5]">Chưa có bước điều trị.</td></tr></tbody></table></div>
              <p className="mb-2 mt-4 text-[10px] font-bold">Buổi điều trị thực tế / Đã xếp lịch</p><div className="overflow-x-auto rounded-md border border-[#dfe7f0]"><table className="w-full min-w-[480px] text-left text-[10px]"><thead className="bg-[#f5f8fc] text-[#71839a]"><tr><th className="px-2.5 py-2 font-semibold">Buổi / Thời gian</th><th className="px-2.5 py-2 font-semibold">Liên kết bước</th><th className="px-2.5 py-2 font-semibold">Người thực hiện</th><th className="px-2.5 py-2 font-semibold">Trạng thái</th></tr></thead><tbody><tr><td colSpan={4} className="px-3 py-8 text-center text-[#8291a5]">Chưa có buổi điều trị nào được xếp lịch.</td></tr></tbody></table></div></div>
          </Card>
          <div className="space-y-3">
            <Card className="p-4"><h2 className="text-[13px] font-bold">Thông tin phác đồ hiện tại</h2><p className="mt-2 text-[10px] leading-5 text-[#8291a5]">Chưa có phiên bản hoặc lịch sử cập nhật.</p></Card>
            <Card className="p-4"><h2 className="text-[13px] font-bold">Điều phối điều trị</h2><div className="mt-3 flex items-start gap-2 text-[10px]"><CalendarDays size={14} className="mt-0.5 text-[#6483a9]" /><div><p className="text-[#8291a5]">Buổi tiếp theo</p><p className="mt-1 font-semibold">Chưa xếp lịch</p></div></div><Link href={currentVisitId ? `/bacsi/protocols?visitId=${encodeURIComponent(currentVisitId)}` : '/bacsi/protocols'} className="mt-3 flex h-9 items-center justify-center gap-2 rounded-md bg-[#2864c8] text-[10px] font-bold text-white hover:bg-[#1f55ad]"><ArrowRight size={14} /> Chọn phác đồ chuẩn</Link><p className="mt-3 text-[9px] leading-4 text-[#8694a8]">Giai đoạn và lịch hẹn được tạo từ nội dung của mẫu đã chọn.</p></Card>
          </div>
        </div>
      </div>}

    </div>
  );
}
