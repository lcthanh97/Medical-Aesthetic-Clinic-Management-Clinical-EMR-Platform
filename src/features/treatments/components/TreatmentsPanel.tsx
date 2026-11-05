'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { 
  createPlan, 
  createStep, 
  deletePlan, 
  deleteStep, 
  updateStep,
  getAllMedicines,
  getAllSupplies,
  completeStepWithInventoryDeduction
} from '../actions';
import { Package, Check, Plus, Trash2, X, AlertCircle, Loader2 } from 'lucide-react';

type DoctorTreatmentPlan = {
  id: string;
  name: string;
  status: string;
  version: number;
  diagnosisSummary: string | null;
  goal: string | null;
  startDate: string | null;
  expectedEndDate: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { fullName: string };
  stages: Array<{
    id: string;
    name: string;
    status: string;
    orderNo: number;
    goal: string | null;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    steps: Array<{
      id: string;
      orderNo: number;
      content: string;
      repeatCount: number;
      intervalDays: number | null;
      plannedDurationMinutes: number | null;
      status: string;
    }>;
    sessions: Array<{
      id: string;
      sessionNo: number;
      scheduledAt: string | null;
      startedAt: string | null;
      completedAt: string | null;
      status: string;
      step: { id: string; orderNo: number; content: string } | null;
      performedBy: { fullName: string } | null;
    }>;
  }>;
  visit: { id: string; visitDate: string; status: string; patient: { id: string; patientCode: string; fullName: string } };
};

function dateLabel(value: string | null | undefined) {
  if (!value) return 'Chưa có dữ liệu';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Chưa có dữ liệu' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function ReadOnlyTreatmentPlans({ plans }: { plans: DoctorTreatmentPlan[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const statuses = [...new Set(plans.map((plan) => plan.status))].sort((a, b) => a.localeCompare(b));
  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const filteredPlans = plans.filter((plan) => {
    const matchesStatus = !status || plan.status === status;
    const matchesSearch = !normalizedSearch || [plan.name, plan.status, plan.diagnosisSummary ?? '', plan.goal ?? '']
      .some((value) => value.toLocaleLowerCase('vi').includes(normalizedSearch));
    return matchesStatus && matchesSearch;
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="font-semibold text-slate-900">Phác đồ điều trị</h2><p className="mt-1 text-xs text-slate-500">Dữ liệu chỉ đọc từ TreatmentPlan, TreatmentStage, TreatmentStep và TreatmentSession.</p></div>
        <div className="grid gap-2 sm:grid-cols-[minmax(14rem,1fr)_12rem_auto]">
          <label className="sr-only" htmlFor="treatment-search">Tìm phác đồ</label>
          <input id="treatment-search" value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="Tìm tên, chẩn đoán hoặc mục tiêu" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="sr-only" htmlFor="treatment-status">Lọc trạng thái</label>
          <select id="treatment-status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <button type="button" onClick={() => router.refresh()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Làm mới</button>
        </div>
      </div>

      {!filteredPlans.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-800">{plans.length ? 'Không có phác đồ phù hợp bộ lọc.' : 'Visit này chưa có phác đồ điều trị.'}</p>
          <p className="mt-1 text-sm text-slate-500">Không tạo dữ liệu hoặc mẫu phác đồ tự động.</p>
        </div>
      ) : filteredPlans.map((plan) => (
        <article key={plan.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-medium text-blue-700">TreatmentPlan · v{plan.version}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{plan.name}</h3><p className="mt-1 text-sm text-slate-500">Tạo bởi {plan.createdBy.fullName} · Cập nhật {dateLabel(plan.updatedAt)}</p></div>
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{plan.status}</span>
          </header>

          <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metadata label="Chẩn đoán tóm tắt" value={plan.diagnosisSummary} />
                <Metadata label="Mục tiêu điều trị" value={plan.goal} />
                <Metadata label="Thời gian kế hoạch" value={`${dateLabel(plan.startDate)} → ${dateLabel(plan.expectedEndDate)}`} />
              </div>

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold text-slate-900">Giai đoạn & bước</h4><p className="text-xs text-slate-500">Thứ tự và trạng thái hiển thị nguyên trạng từ database.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{plan.stages.length} giai đoạn</span></div>
                {!plan.stages.length ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có giai đoạn được lưu.</p> : <div className="space-y-3">{plan.stages.map((stage) => (
                  <div key={stage.id} className="rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 p-3"><div><p className="font-semibold text-slate-800">{stage.orderNo}. {stage.name}</p>{stage.goal && <p className="mt-1 text-xs text-slate-500">{stage.goal}</p>}</div><span className="rounded-full bg-white px-2.5 py-1 text-xs text-slate-600">{stage.status}</span></div>
                    <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-white text-slate-500"><tr><th className="px-3 py-2">Thứ tự / Nội dung</th><th className="px-3 py-2">Lặp lại</th><th className="px-3 py-2">Khoảng cách</th><th className="px-3 py-2">Thời lượng</th><th className="px-3 py-2">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{stage.steps.map((step) => <tr key={step.id}><td className="px-3 py-2.5 font-medium text-slate-800">{step.orderNo}. {step.content}</td><td className="px-3 py-2.5 text-slate-600">{step.repeatCount}</td><td className="px-3 py-2.5 text-slate-600">{step.intervalDays ?? '—'}</td><td className="px-3 py-2.5 text-slate-600">{step.plannedDurationMinutes ?? '—'}</td><td className="px-3 py-2.5 text-slate-600">{step.status}</td></tr>)}</tbody></table></div>
                    {!stage.steps.length && <p className="p-3 text-xs text-slate-500">Chưa có bước được lưu.</p>}
                  </div>
                ))}</div>}
              </section>

              <section className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="font-semibold text-slate-900">Buổi điều trị đã ghi nhận</h4><p className="text-xs text-slate-500">Lịch và trạng thái lấy từ TreatmentSession; không thay đổi lịch hay trạng thái tại đây.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{plan.stages.reduce((count, stage) => count + stage.sessions.length, 0)} buổi</span></div>
                {plan.stages.every((stage) => stage.sessions.length === 0) ? <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">Chưa có buổi điều trị.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-3 py-2">Buổi / thời gian</th><th className="px-3 py-2">Bước liên kết</th><th className="px-3 py-2">Người thực hiện</th><th className="px-3 py-2">Trạng thái</th></tr></thead><tbody className="divide-y divide-slate-100">{plan.stages.flatMap((stage) => stage.sessions.map((session) => <tr key={session.id}><td className="px-3 py-2.5 text-slate-700">Buổi {session.sessionNo} · {dateLabel(session.scheduledAt ?? session.startedAt ?? session.completedAt)}</td><td className="px-3 py-2.5 text-slate-700">{session.step ? `${session.step.orderNo}. ${session.step.content}` : 'Chưa liên kết bước'}</td><td className="px-3 py-2.5 text-slate-700">{session.performedBy?.fullName ?? 'Chưa ghi nhận'}</td><td className="px-3 py-2.5 text-slate-700">{session.status}</td></tr>))}</tbody></table></div>}
              </section>
            </div>

            <aside className="space-y-3">
              <section className="rounded-lg border border-slate-200 p-4"><h4 className="font-semibold text-slate-900">Thông tin phác đồ</h4><dl className="mt-3 space-y-3 text-sm"><Metadata label="Phiên bản" value={`v${plan.version}`} /><Metadata label="Ngày bắt đầu" value={dateLabel(plan.startDate)} /><Metadata label="Dự kiến kết thúc" value={dateLabel(plan.expectedEndDate)} /><Metadata label="Hoàn tất" value={dateLabel(plan.completedAt)} /><Metadata label="Ghi chú" value={plan.notes} /></dl></section>
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><h4 className="font-semibold text-slate-900">Điều phối điều trị</h4><p className="mt-2 text-xs leading-5 text-slate-600">Các thao tác tạo/cập nhật phác đồ, buổi điều trị và tiêu hao kho đang khóa cho tới khi xác minh quyền ghi và quy trình nghiệp vụ.</p><button type="button" disabled title="Chức năng ghi Treatment đang fail-closed" className="mt-3 w-full cursor-not-allowed rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-500">Mở buổi điều trị</button></section>
            </aside>
          </div>
        </article>
      ))}
    </section>
  );
}

function Metadata({ label, value }: { label: string; value: string | null | undefined }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value || 'Chưa có dữ liệu'}</dd></div>;
}

export function TreatmentsPanel({ initialPlans = [], visitId, employees = [], readOnly = false }: { initialPlans: DoctorTreatmentPlan[], visitId: string, employees?: any[], readOnly?: boolean }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initialPlans);
  
  // State for forms
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', stage: 'Khỏe', status: 'Lên kế hoạch' });

  const [activePlanIdForStep, setActivePlanIdForStep] = useState<string | null>(null);
  const [newStep, setNewStep] = useState({ orderNo: 1, content: '', status: 'Lên kế hoạch' });

  // Edit state
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepData, setEditStepData] = useState({ orderNo: 1, content: '', status: 'Lên kế hoạch' });

  // State cho Modal "Hoàn thành & Trừ kho tự động"
  const [deductModalStep, setDeductModalStep] = useState<any | null>(null);
  const [activePlanIdForDeduct, setActivePlanIdForDeduct] = useState<string | null>(null);
  const [availableMedicines, setAvailableMedicines] = useState<any[]>([]);
  const [availableSupplies, setAvailableSupplies] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employees[0]?.id || '');
  const [consumptionItems, setConsumptionItems] = useState<Array<{
    type: 'MEDICINE' | 'SUPPLY';
    itemId: string;
    actualQuantity: number;
    unit: string;
    notes: string;
  }>>([]);
  const [isDeducting, setIsDeducting] = useState(false);
  const [deductSuccessMessage, setDeductSuccessMessage] = useState<string | null>(null);

  if (readOnly) return <ReadOnlyTreatmentPlans plans={initialPlans} />;

  // Mở modal Trừ kho cho 1 bước điều trị
  const handleOpenDeductModal = async (step: any, planId: string) => {
    setDeductModalStep(step);
    setActivePlanIdForDeduct(planId);
    setDeductSuccessMessage(null);

    // Nạp danh mục thuốc và vật tư nếu chưa có
    if (availableMedicines.length === 0 || availableSupplies.length === 0) {
      const [medRes, supRes] = await Promise.all([
        getAllMedicines(),
        getAllSupplies()
      ]);
      if (medRes.success && medRes.data) setAvailableMedicines(medRes.data);
      if (supRes.success && supRes.data) setAvailableSupplies(supRes.data);
    }

    // Khởi tạo sẵn 1 dòng tiêu hao rỗng
    setConsumptionItems([
      { type: 'MEDICINE', itemId: '', actualQuantity: 1, unit: '', notes: '' }
    ]);
  };

  const handleCloseDeductModal = () => {
    setDeductModalStep(null);
    setActivePlanIdForDeduct(null);
    setConsumptionItems([]);
    setDeductSuccessMessage(null);
  };

  // Thêm dòng tiêu hao
  const handleAddConsumptionRow = () => {
    setConsumptionItems([
      ...consumptionItems,
      { type: 'MEDICINE', itemId: '', actualQuantity: 1, unit: '', notes: '' }
    ]);
  };

  // Xóa dòng tiêu hao
  const handleRemoveConsumptionRow = (index: number) => {
    setConsumptionItems(consumptionItems.filter((_, idx) => idx !== index));
  };

  // Cập nhật trường dòng tiêu hao
  const handleUpdateConsumptionRow = (index: number, field: string, value: any) => {
    setConsumptionItems(consumptionItems.map((item, idx) => {
      if (idx !== index) return item;
      const updated = { ...item, [field]: value };

      // Tự động gán đơn vị tính khi chọn item
      if (field === 'itemId') {
        if (updated.type === 'MEDICINE') {
          const med = availableMedicines.find(m => m.id === value);
          if (med) updated.unit = med.unit;
        } else {
          const sup = availableSupplies.find(s => s.id === value);
          if (sup) updated.unit = sup.unit;
        }
      } else if (field === 'type') {
        updated.itemId = '';
        updated.unit = '';
      }
      return updated;
    }));
  };

  // Submit xác nhận trừ kho
  const handleConfirmDeduct = async () => {
    if (!deductModalStep) return;

    // Validate
    const validItems = consumptionItems.filter(item => item.itemId && item.actualQuantity > 0);
    if (validItems.length === 0) {
      alert('Vui lòng chọn ít nhất 1 thuốc hoặc vật tư với số lượng/ml thực tế lớn hơn 0.');
      return;
    }

    if (!selectedEmployeeId && employees.length > 0) {
      alert('Vui lòng chọn nhân viên thực hiện ca điều trị.');
      return;
    }

    setIsDeducting(true);
    const res = await completeStepWithInventoryDeduction({
      stepId: deductModalStep.id,
      visitId,
      performedById: selectedEmployeeId || (employees[0]?.id ?? 'system'),
      consumptions: validItems,
      notes: `Trừ kho sau ca/bước: ${deductModalStep.content}`
    });

    if (res.success) {
      // Cập nhật trạng thái bước trong plans state
      if (activePlanIdForDeduct) {
        setPlans(plans.map((p: any) => {
          if (p.id === activePlanIdForDeduct) {
            return {
              ...p,
              stages: (p.stages || []).map((stage: any) => ({
                ...stage,
                steps: (stage.steps || []).map((s: any) => 
                  s.id === deductModalStep.id ? { ...s, status: 'Hoàn thành' } : s
                )
              }))
            };
          }
          return p;
        }));
      }

      setDeductSuccessMessage(`✓ Đã trừ kho thành công ${res.data.totalItemsDeducted} mặt hàng và chuyển bước sang "Hoàn thành"!`);
      setTimeout(() => {
        handleCloseDeductModal();
      }, 1500);
    } else {
      alert('Lỗi trừ kho: ' + (res.error || 'Có lỗi xảy ra'));
    }
    setIsDeducting(false);
  };

  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name) return;
    
    const res = await createPlan({
      visitId,
      name: newPlan.name,
      stage: newPlan.stage,
      status: newPlan.status
    });
    
    if (res.success) {
      router.refresh();
      setNewPlan({ name: '', stage: 'Khỏe', status: 'Lên kế hoạch' });
      setShowPlanForm(false);
    } else {
      alert("Lỗi khi thêm kế hoạch: " + res.error);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa phác đồ này?')) return;
    const res = await deletePlan(id);
    if (res.success) {
      setPlans(plans.filter((p: any) => p.id !== id));
    } else {
      alert("Lỗi khi xóa: " + res.error);
    }
  };

  const handleAddStep = async (e: React.FormEvent, planId: string) => {
    e.preventDefault();
    if (!newStep.content) return;
    
    const payload: any = {
      planId,
      orderNo: newStep.orderNo,
      content: newStep.content,
      status: newStep.status
    };

    const res = await createStep(payload);
    
    if (res.success) {
      setPlans(plans.map((p: any) => {
        if (p.id === planId) {
          const currentStage = p.stages?.[0] || { steps: [] };
          return { ...p, stages: [{ ...currentStage, steps: [...(currentStage.steps || []), res.data] }] };
        }
        return p;
      }));
      setNewStep({ orderNo: 1, content: '', status: 'Lên kế hoạch' });
      setActivePlanIdForStep(null);
    } else {
      alert("Lỗi khi thêm bước: " + res.error);
    }
  };

  const handleDeleteStep = async (stepId: string, planId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bước điều trị này?')) return;
    const res = await deleteStep(stepId);
    if (res.success) {
      setPlans(plans.map((p: any) => {
        if (p.id === planId) {
          const currentStage = p.stages?.[0] || { steps: [] };
          return { ...p, stages: [{ ...currentStage, steps: currentStage.steps.filter((s: any) => s.id !== stepId) }] };
        }
        return p;
      }));
    }
  };

  const handleSaveEdit = async (stepId: string, planId: string) => {
    if (!editStepData.content) return;

    const payload: any = {
      orderNo: editStepData.orderNo,
      content: editStepData.content,
      status: editStepData.status,
    };

    const res = await updateStep(stepId, payload);
    if (res.success) {
      setPlans(plans.map((p: any) => {
        if (p.id === planId) {
          const currentStage = p.stages?.[0] || { steps: [] };
          return { ...p, stages: [{ ...currentStage, steps: currentStage.steps.map((s: any) => s.id === stepId ? res.data : s) }] };
        }
        return p;
      }));
      setEditingStepId(null);
    } else {
      alert("Lỗi khi cập nhật: " + res.error);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Kế hoạch điều trị (Phác đồ theo giai đoạn)</h2>
        <Button onClick={() => setShowPlanForm(!showPlanForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer">
          {showPlanForm ? 'Hủy' : '+ Thêm Phác đồ'}
        </Button>
      </div>

      {showPlanForm && (
        <form onSubmit={handleAddPlan} className="bg-indigo-50/50 p-5 rounded-lg border border-indigo-100 mb-6 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả / Tên phác đồ</label>
            <input required type="text" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border outline-none" placeholder="VD: Điều trị mụn viêm nặng..." />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Giai đoạn</label>
            <select value={newPlan.stage} onChange={e => setNewPlan({...newPlan, stage: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border outline-none bg-white">
              <option value="Khỏe">Khỏe</option>
              <option value="Phơi nhiễm">Phơi nhiễm</option>
              <option value="Tiền lâm sàng">Tiền lâm sàng</option>
              <option value="Lâm sàng">Lâm sàng</option>
              <option value="Diễn biến tiếp tục">Diễn biến tiếp tục</option>
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select value={newPlan.status} onChange={e => setNewPlan({...newPlan, status: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border outline-none bg-white">
              <option value="Lên kế hoạch">Lên kế hoạch</option>
              <option value="Đang thực hiện">Đang thực hiện</option>
              <option value="Hoàn thành">Hoàn thành</option>
              <option value="Đã hủy">Đã hủy</option>
            </select>
          </div>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium h-[42px] cursor-pointer">
            Lưu phác đồ
          </Button>
        </form>
      )}

      <div className="space-y-6">
        {plans.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">Chưa có phác đồ điều trị nào được thiết lập.</p>
          </div>
        ) : (
          plans.map((plan: any) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      plan.stage === 'Khỏe' ? 'bg-green-100 text-green-700' :
                      plan.stage === 'Phơi nhiễm' ? 'bg-yellow-100 text-yellow-700' :
                      plan.stage === 'Tiền lâm sàng' ? 'bg-orange-100 text-orange-700' :
                      plan.stage === 'Lâm sàng' ? 'bg-red-100 text-red-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>Giai đoạn: {plan.stage}</span>
                    <span className="text-xs text-gray-500">Trạng thái: <span className="font-medium text-indigo-600">{plan.status}</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => {
                    if (activePlanIdForStep === plan.id) {
                      setActivePlanIdForStep(null);
                    } else {
                      setActivePlanIdForStep(plan.id);
                      const steps = plan.stages?.[0]?.steps || [];
                      const maxOrder = steps.length > 0 
                        ? Math.max(...steps.map((s: any) => s.orderNo))
                        : 0;
                      setNewStep({ orderNo: maxOrder + 1, content: '', status: 'Lên kế hoạch' });
                    }
                  }} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm py-1.5 px-3 border border-indigo-200 cursor-pointer">
                    {activePlanIdForStep === plan.id ? 'Hủy' : '+ Thêm Bước'}
                  </Button>
                  <Button onClick={() => handleDeletePlan(plan.id)} className="bg-red-50 text-red-700 hover:bg-red-100 text-sm py-1.5 px-3 border border-red-200 cursor-pointer">Xóa</Button>
                </div>
              </div>

              {activePlanIdForStep === plan.id && (
                <div className="p-4 bg-indigo-50/30 border-b border-indigo-100">
                  <form onSubmit={(e) => handleAddStep(e, plan.id)} className="flex gap-3 items-end flex-wrap">
                    <div className="w-16">
                      <label className="block text-xs font-medium text-gray-700 mb-1">STT</label>
                      <input required type="number" min="1" value={newStep.orderNo} onChange={e => setNewStep({...newStep, orderNo: parseInt(e.target.value)})} className="w-full rounded-md border-gray-300 shadow-sm p-1.5 border outline-none text-sm" />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nội dung thực hiện</label>
                      <input required type="text" value={newStep.content} onChange={e => setNewStep({...newStep, content: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm p-1.5 border outline-none text-sm" placeholder="Nhập chi tiết bước điều trị..." />
                    </div>

                    <div className="w-32">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Trạng thái</label>
                      <select value={newStep.status} onChange={e => setNewStep({...newStep, status: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm p-1.5 border outline-none bg-white text-sm">
                        <option value="Lên kế hoạch">Lên kế hoạch</option>
                        <option value="Đang thực hiện">Đang thực hiện</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                      </select>
                    </div>
                    <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-1.5 h-[34px] cursor-pointer">
                      Lưu Bước
                    </Button>
                  </form>
                </div>
              )}

              <div className="p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="py-2 px-5 font-medium w-16">STT</th>
                      <th className="py-2 px-5 font-medium">Nội dung thực hiện</th>
                      <th className="py-2 px-5 font-medium w-32">Trạng thái</th>
                      <th className="py-2 px-5 font-medium w-64 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!plan.stages?.[0]?.steps || plan.stages[0].steps.length === 0) ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-400 italic">Chưa có bước điều trị nào</td>
                      </tr>
                    ) : (
                      plan.stages[0].steps.map((step: any) => (
                        <tr key={step.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                          {editingStepId === step.id ? (
                            <>
                              <td className="py-2 px-3">
                                <input type="number" min="1" value={editStepData.orderNo} onChange={e => setEditStepData({...editStepData, orderNo: parseInt(e.target.value)})} className="w-12 rounded border-gray-300 shadow-sm p-1 border text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <input type="text" value={editStepData.content} onChange={e => setEditStepData({...editStepData, content: e.target.value})} className="w-full rounded border-gray-300 shadow-sm p-1 border text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <select value={editStepData.status} onChange={e => setEditStepData({...editStepData, status: e.target.value})} className="w-full rounded border-gray-300 shadow-sm p-1 border text-sm bg-white">
                                  <option value="Lên kế hoạch">Lên kế hoạch</option>
                                  <option value="Đang thực hiện">Đang thực hiện</option>
                                  <option value="Hoàn thành">Hoàn thành</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                <button onClick={() => handleSaveEdit(step.id, plan.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded mr-1 cursor-pointer">Lưu</button>
                                <button onClick={() => setEditingStepId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded cursor-pointer">Hủy</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 px-5 text-gray-600 font-medium">{step.orderNo}</td>
                              <td className="py-3 px-5 text-gray-800 font-medium">{step.content}</td>
                              <td className="py-3 px-5">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  step.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' :
                                  step.status === 'Đang thực hiện' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {step.status}
                                </span>
                              </td>
                              <td className="py-3 px-5 text-right whitespace-nowrap space-x-1.5">
                                {/* Nút Hoàn thành ca & Trừ kho tự động */}
                                {step.status !== 'Hoàn thành' && (
                                  <button 
                                    onClick={() => handleOpenDeductModal(step, plan.id)} 
                                    className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-200 transition-colors cursor-pointer shadow-xs"
                                    title="Ghi nhận tiêu hao thực tế và trừ kho tự động"
                                  >
                                    <Check size={13} /> Hoàn thành & Trừ kho
                                  </button>
                                )}

                                <button onClick={() => {
                                  setEditStepData({
                                    orderNo: step.orderNo,
                                    content: step.content,
                                    status: step.status
                                  });
                                  setEditingStepId(step.id);
                                }} className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded cursor-pointer">Sửa</button>
                                
                                <button onClick={() => handleDeleteStep(step.id, plan.id)} className="text-red-500 hover:text-red-700 text-xs font-medium bg-red-50 hover:bg-red-100 px-2 py-1 rounded cursor-pointer">Xóa</button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL TRỪ KHO TỰ ĐỘNG THEO CA ĐIỀU TRỊ */}
      {deductModalStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Package size={20} />
                  Hoàn thành ca điều trị & Trừ kho tự động
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Bước {deductModalStep.orderNo}: {deductModalStep.content}
                </p>
              </div>
              <button onClick={handleCloseDeductModal} className="text-white/80 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {deductSuccessMessage && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-semibold flex items-center gap-2">
                  <Check size={18} className="text-green-600" />
                  {deductSuccessMessage}
                </div>
              )}

              {/* Chọn nhân viên thực hiện */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nhân viên / Bác sĩ thực hiện ca
                </label>
                <select 
                  value={selectedEmployeeId} 
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {employees.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Danh sách tiêu hao thực tế */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Thuốc / Hoạt chất & Vật tư tiêu hao thực tế
                  </label>
                  <button 
                    type="button" 
                    onClick={handleAddConsumptionRow}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                  >
                    <Plus size={14} /> Thêm mặt hàng tiêu hao
                  </button>
                </div>

                <div className="space-y-3">
                  {consumptionItems.map((item, index) => {
                    const currentSource = item.type === 'MEDICINE' ? availableMedicines : availableSupplies;
                    const selectedDetail = currentSource.find(s => s.id === item.itemId);

                    return (
                      <div key={index} className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 relative">
                        {consumptionItems.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveConsumptionRow(index)}
                            className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 cursor-pointer"
                            title="Xóa dòng này"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                          {/* Phân loại */}
                          <div className="sm:col-span-3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Loại</label>
                            <select 
                              value={item.type} 
                              onChange={e => handleUpdateConsumptionRow(index, 'type', e.target.value)}
                              className="w-full rounded-md border border-gray-300 p-1.5 text-xs bg-white outline-none font-medium text-gray-700"
                            >
                              <option value="MEDICINE">Thuốc / Dung dịch</option>
                              <option value="SUPPLY">Vật tư tiêu hao</option>
                            </select>
                          </div>

                          {/* Chọn mặt hàng */}
                          <div className="sm:col-span-5">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Mặt hàng trong kho</label>
                            <select 
                              value={item.itemId} 
                              onChange={e => handleUpdateConsumptionRow(index, 'itemId', e.target.value)}
                              className="w-full rounded-md border border-gray-300 p-1.5 text-xs bg-white outline-none font-medium text-gray-800"
                            >
                              <option value="">-- Chọn {item.type === 'MEDICINE' ? 'thuốc' : 'vật tư'} --</option>
                              {currentSource.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Tồn: {s.stock} {s.unit})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Số lượng / ml thực tế */}
                          <div className="sm:col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Số lượng / ml thực tế
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="number" 
                                min="0.01" 
                                step="any"
                                value={item.actualQuantity} 
                                onChange={e => handleUpdateConsumptionRow(index, 'actualQuantity', parseFloat(e.target.value) || 0)}
                                className="w-full rounded-md border border-gray-300 p-1.5 text-xs text-right font-bold text-emerald-700 bg-white outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                              <span className="text-xs font-semibold text-gray-600 min-w-[32px]">
                                {item.unit || 'đv'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Thông tin tồn kho & Cảnh báo */}
                        {selectedDetail && (
                          <div className="text-xs flex items-center justify-between text-gray-500 pt-1 border-t border-gray-200/60">
                            <span>Đơn giá: {Number(selectedDetail.unitCost).toLocaleString('vi-VN')} VNĐ/{selectedDetail.unit}</span>
                            <span className={Number(selectedDetail.stock) < item.actualQuantity ? 'text-red-600 font-bold' : 'text-emerald-700 font-medium'}>
                              Tồn: {selectedDetail.stock} → Sau trừ: {Math.max(0, Number(selectedDetail.stock) - item.actualQuantity)} {selectedDetail.unit}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <span>
                  Hệ thống sẽ <strong>tự động trừ tồn kho</strong> tương ứng của các mặt hàng trên, đồng thời ghi nhận phiếu giao dịch <strong>Inventory Transaction (Loại: TREATMENT_USAGE)</strong> và liên kết vào hồ sơ tiêu hao ca điều trị.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={handleCloseDeductModal}
                disabled={isDeducting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDeduct}
                disabled={isDeducting}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition-colors"
              >
                {isDeducting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Xác nhận hoàn thành & Trừ kho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
