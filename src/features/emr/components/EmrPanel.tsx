'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  User, 
  Calendar, 
  Clock, 
  Stethoscope, 
  Activity, 
  Pill, 
  CreditCard, 
  AlertTriangle, 
  Plus, 
  Search, 
  Edit3, 
  Printer, 
  CheckCircle2, 
  ChevronRight, 
  Image as ImageIcon, 
  Phone, 
  ShieldAlert, 
  Sparkles, 
  X, 
  Loader2,
  CalendarDays,
  FileCheck,
  HeartPulse
} from 'lucide-react';
import { 
  createPatient, 
  saveMedicalRecord, 
  addPatientAllergy, 
  addPatientHistory, 
  createQuickVisit, 
  getPatientFullEMR 
} from '../actions';

interface EmrPanelProps {
  initialPatients: any[];
  initialSelectedPatient?: any;
}

export function EmrPanel({ initialPatients = [], initialSelectedPatient }: EmrPanelProps) {
  const [patients, setPatients] = useState<any[]>(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialSelectedPatient?.id || initialPatients[0]?.id || ''
  );
  const [selectedPatient, setSelectedPatient] = useState<any>(
    initialSelectedPatient || (initialPatients.length > 0 ? initialPatients[0] : null)
  );
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'HAS_ALLERGIES' | 'HAS_VISITS' | 'HAS_PLANS'>('ALL');
  const [activeTab, setActiveTab] = useState<'records' | 'plans' | 'prescriptions' | 'orders' | 'images' | 'billing'>('records');

  // Modals state
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({ fullName: '', phone: '', dateOfBirth: '' });
  const [isSavingPatient, setIsSavingPatient] = useState(false);

  const [showQuickVisitModal, setShowQuickVisitModal] = useState(false);
  const [quickVisitForm, setQuickVisitForm] = useState({ preliminaryDiagnosis: '', finalDiagnosis: '', notes: '' });
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  const [showEditRecordModal, setShowEditRecordModal] = useState(false);
  const [editingRecordVisit, setEditingRecordVisit] = useState<any>(null);
  const [recordForm, setRecordForm] = useState({ preliminaryDiagnosis: '', finalDiagnosis: '', notes: '' });
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  const [showAddAllergyModal, setShowAddAllergyModal] = useState(false);
  const [allergyForm, setAllergyForm] = useState({ substance: '', severity: 'Vừa', reaction: '' });
  const [isSavingAllergy, setIsSavingAllergy] = useState(false);

  const [showAddHistoryModal, setShowAddHistoryModal] = useState(false);
  const [historyForm, setHistoryForm] = useState({ type: 'Bản thân', content: '' });
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // Chọn bệnh nhân khác
  const handleSelectPatient = async (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsLoadingDetail(true);
    const res = await getPatientFullEMR(patientId);
    if (res.success && res.data) {
      setSelectedPatient(res.data);
    }
    setIsLoadingDetail(false);
  };

  // Thêm bệnh nhân mới
  const handleCreatePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.fullName.trim()) {
      alert('Vui lòng nhập họ và tên bệnh nhân.');
      return;
    }
    setIsSavingPatient(true);
    const res = await createPatient(newPatientForm);
    if (res.success && res.data) {
      const created = res.data;
      setPatients(prev => [created, ...prev]);
      setShowAddPatientModal(false);
      setNewPatientForm({ fullName: '', phone: '', dateOfBirth: '' });
      await handleSelectPatient(created.id);
    } else {
      alert('Lỗi tạo bệnh nhân: ' + (res.error || 'Có lỗi xảy ra'));
    }
    setIsSavingPatient(false);
  };

  // Tạo đợt khám mới
  const handleCreateQuickVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;
    setIsSavingVisit(true);
    const res = await createQuickVisit(selectedPatientId, quickVisitForm);
    if (res.success) {
      setShowQuickVisitModal(false);
      setQuickVisitForm({ preliminaryDiagnosis: '', finalDiagnosis: '', notes: '' });
      await handleSelectPatient(selectedPatientId);
    } else {
      alert('Lỗi tạo đợt khám: ' + (res.error || 'Có lỗi xảy ra'));
    }
    setIsSavingVisit(false);
  };

  // Lưu chỉnh sửa bệnh án
  const handleSaveMedicalRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecordVisit?.id) return;
    setIsSavingRecord(true);
    const res = await saveMedicalRecord(editingRecordVisit.id, recordForm);
    if (res.success) {
      setShowEditRecordModal(false);
      setEditingRecordVisit(null);
      await handleSelectPatient(selectedPatientId);
    } else {
      alert('Lỗi lưu bệnh án: ' + (res.error || 'Có lỗi xảy ra'));
    }
    setIsSavingRecord(false);
  };

  // Mở modal sửa bệnh án
  const handleOpenEditRecord = (visit: any) => {
    setEditingRecordVisit(visit);
    setRecordForm({
      preliminaryDiagnosis: visit.medicalRecord?.preliminaryDiagnosis || '',
      finalDiagnosis: visit.medicalRecord?.finalDiagnosis || '',
      notes: visit.medicalRecord?.notes || ''
    });
    setShowEditRecordModal(true);
  };

  // Thêm dị ứng
  const handleAddAllergySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !allergyForm.substance.trim()) return;
    setIsSavingAllergy(true);
    const res = await addPatientAllergy(selectedPatientId, allergyForm);
    if (res.success) {
      setShowAddAllergyModal(false);
      setAllergyForm({ substance: '', severity: 'Vừa', reaction: '' });
      await handleSelectPatient(selectedPatientId);
    } else {
      alert('Lỗi: ' + (res.error || 'Có lỗi xảy ra'));
    }
    setIsSavingAllergy(false);
  };

  // Thêm tiền sử bệnh
  const handleAddHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !historyForm.content.trim()) return;
    setIsSavingHistory(true);
    const res = await addPatientHistory(selectedPatientId, historyForm);
    if (res.success) {
      setShowAddHistoryModal(false);
      setHistoryForm({ type: 'Bản thân', content: '' });
      await handleSelectPatient(selectedPatientId);
    } else {
      alert('Lỗi: ' + (res.error || 'Có lỗi xảy ra'));
    }
    setIsSavingHistory(false);
  };

  // Tính tuổi
  const calculateAge = (dateOfBirth?: string | Date | null) => {
    if (!dateOfBirth) return '---';
    const dob = new Date(dateOfBirth);
    const diffMs = Date.now() - dob.getTime();
    const ageDt = new Date(diffMs);
    const age = Math.abs(ageDt.getUTCFullYear() - 1970);
    return isNaN(age) ? '---' : `${age} tuổi`;
  };

  // Lọc danh sách bệnh nhân
  const filteredPatients = patients.filter(p => {
    const q = searchTerm.toLowerCase();
    const nameMatch = (p.fullName || '').toLowerCase().includes(q);
    const codeMatch = (p.patientCode || '').toLowerCase().includes(q);
    const phoneMatch = (p.phone || '').toLowerCase().includes(q);
    const matchesSearch = nameMatch || codeMatch || phoneMatch;

    if (!matchesSearch) return false;

    if (filterType === 'HAS_ALLERGIES') {
      return (p.allergies?.length || p._count?.allergies || 0) > 0;
    }
    if (filterType === 'HAS_VISITS') {
      return (p.visits?.length || p._count?.visits || 0) > 0;
    }
    if (filterType === 'HAS_PLANS') {
      return (p.treatmentPlans?.length || p._count?.treatmentPlans || 0) > 0;
    }

    return true;
  });

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* CỘT TRÁI: DANH SÁCH BỆNH NHÂN (GỌN GÀNG CÓ THANH TRƯỢT & FONT CHỮ DỄ ĐỌC) */}
      <div className="w-full lg:w-[340px] xl:w-[365px] flex-shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-sm flex flex-col h-[calc(100vh-100px)] sticky top-4 overflow-hidden">
        {/* Header danh sách cố định */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-blue-600" size={18} />
                Bệnh nhân ({filteredPatients.length})
              </h2>
            </div>
            <button
              onClick={() => setShowAddPatientModal(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus size={14} /> Thêm BN
            </button>
          </div>

          {/* Ô tìm kiếm vừa vặn, dễ đọc */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm tên, mã BN, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>

          {/* Bộ lọc nhanh rõ ràng */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'ALL' ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('HAS_ALLERGIES')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                filterType === 'HAS_ALLERGIES' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle size={12} className="text-amber-500" /> Dị ứng
            </button>
            <button
              onClick={() => setFilterType('HAS_VISITS')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'HAS_VISITS' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Có lượt khám
            </button>
          </div>
        </div>

        {/* Danh sách thẻ bệnh nhân có THANH TRƯỢT DỄ DÀNG */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
          {filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <User className="mx-auto mb-2 text-slate-300" size={32} />
              <p className="text-sm">Không tìm thấy bệnh nhân</p>
            </div>
          ) : (
            filteredPatients.map(p => {
              const isSelected = selectedPatientId === p.id;
              const visitCount = p._count?.visits ?? p.visits?.length ?? 0;
              const allergyCount = p._count?.allergies ?? p.allergies?.length ?? 0;

              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectPatient(p.id)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    isSelected 
                      ? 'bg-blue-50/90 border-blue-400 shadow-2xs ring-1 ring-blue-500/20' 
                      : 'border-transparent hover:bg-slate-50/90 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar vừa mắt, nổi bật */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isSelected ? 'bg-blue-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {p.fullName ? p.fullName.charAt(0).toUpperCase() : 'B'}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Dòng 1: Tên + Mã BN */}
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <h4 className="font-bold text-slate-900 text-sm truncate leading-snug">
                          {p.fullName}
                        </h4>
                        <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold shrink-0">
                          {p.patientCode}
                        </span>
                      </div>

                      {/* Dòng 2: Tuổi, SĐT và Badges */}
                      <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500">
                        <div className="truncate text-slate-600">
                          <span className="font-medium">{calculateAge(p.dateOfBirth)}</span>
                          {p.phone && <span className="text-slate-400"> • {p.phone}</span>}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {visitCount} đợt
                          </span>
                          {allergyCount > 0 && (
                            <span className="text-xs px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200 flex items-center gap-0.5">
                              <AlertTriangle size={10} /> {allergyCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CỘT PHẢI: CHI TIẾT HỒ SƠ BỆNH ÁN ĐIỆN TỬ */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {selectedPatient ? (
          <>
            {/* 1. HEADER BANNER THÔNG TIN BỆNH NHÂN */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50/50 via-indigo-50/20 to-transparent pointer-events-none rounded-bl-full" />

              <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md shadow-blue-500/20 shrink-0">
                    {selectedPatient.fullName?.charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {selectedPatient.fullName}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-mono font-bold">
                        {selectedPatient.patientCode}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <span>Ngày sinh: {selectedPatient.dateOfBirth ? new Date(selectedPatient.dateOfBirth).toLocaleDateString('vi-VN') : '---'} ({calculateAge(selectedPatient.dateOfBirth)})</span>
                      </div>
                      {selectedPatient.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={14} className="text-slate-400" />
                          <span className="font-mono font-medium">{selectedPatient.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Activity size={14} className="text-emerald-500" />
                        <span className="text-emerald-700 font-semibold">{selectedPatient.visits?.length || 0} lần đến khám</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nút hành động trên Header */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => setShowQuickVisitModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus size={16} /> Tạo đợt khám mới
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    title="In bệnh án"
                  >
                    <Printer size={16} /> In EMR
                  </button>
                </div>
              </div>

              {/* Dải Cảnh Báo Lâm Sàng: Dị ứng & Tiền sử */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Khối Cảnh Báo Dị Ứng */}
                <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200/80 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-rose-900 uppercase tracking-wider">Cảnh báo Dị ứng</span>
                      <button
                        onClick={() => setShowAddAllergyModal(true)}
                        className="text-xs text-rose-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> Thêm dị ứng
                      </button>
                    </div>
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedPatient.allergies.map((a: any) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-md text-xs font-semibold border border-rose-200"
                            title={a.reaction ? `Phản ứng: ${a.reaction}` : ''}
                          >
                            ⚠️ {a.substance} ({a.severity || 'Vừa'})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-rose-600/80 italic">Chưa ghi nhận dị ứng thuốc hoặc mỹ phẩm nào.</p>
                    )}
                  </div>
                </div>

                {/* Khối Tiền Sử Bệnh */}
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                    <HeartPulse size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-amber-900 uppercase tracking-wider">Tiền sử bệnh lý</span>
                      <button
                        onClick={() => setShowAddHistoryModal(true)}
                        className="text-xs text-amber-700 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={13} /> Thêm tiền sử
                      </button>
                    </div>
                    {selectedPatient.histories && selectedPatient.histories.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedPatient.histories.map((h: any) => (
                          <span
                            key={h.id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-xs font-semibold border border-amber-200"
                          >
                            • {h.content} ({h.type})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700/80 italic">Chưa có ghi nhận tiền sử bệnh lý nền hoặc sẹo.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. TABS ĐIỀU HƯỚNG EMR */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              <div className="flex border-b border-slate-200/80 bg-slate-50/60 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('records')}
                  className={`flex-1 min-w-[155px] py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                    activeTab === 'records'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <FileText size={17} /> Bệnh án & Đợt khám ({selectedPatient.visits?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('plans')}
                  className={`flex-1 min-w-[155px] py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                    activeTab === 'plans'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <Activity size={17} /> Phác đồ điều trị ({selectedPatient.treatmentPlans?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className={`flex-1 min-w-[155px] py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                    activeTab === 'prescriptions'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <Pill size={17} /> Đơn thuốc ({
                    selectedPatient.visits?.reduce((acc: number, v: any) => acc + (v.prescriptions?.length || 0), 0) || 0
                  })
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 min-w-[155px] py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                    activeTab === 'orders'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <Stethoscope size={17} /> Cận lâm sàng ({
                    selectedPatient.visits?.reduce((acc: number, v: any) => acc + (v.orders?.length || 0), 0) || 0
                  })
                </button>
                <button
                  onClick={() => setActiveTab('images')}
                  className={`flex-1 min-w-[155px] py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                    activeTab === 'images'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <ImageIcon size={17} /> Hình ảnh da ({
                    selectedPatient.visits?.reduce((acc: number, v: any) => acc + (v.treatmentImages?.length || 0), 0) || 0
                  })
                </button>
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`flex-1 min-w-[155px] py-3.5 px-4 text-sm font-semibold transition-all flex items-center justify-center gap-2 border-b-2 cursor-pointer ${
                    activeTab === 'billing'
                      ? 'bg-white text-blue-700 border-blue-600 shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-slate-100/50'
                  }`}
                >
                  <CreditCard size={17} /> Viện phí ({
                    selectedPatient.visits?.reduce((acc: number, v: any) => acc + (v.invoices?.length || 0), 0) || 0
                  })
                </button>
              </div>

              {/* NỘI DUNG TỪNG TAB */}
              <div className="p-6">
                {isLoadingDetail ? (
                  <div className="py-16 text-center text-slate-400">
                    <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
                    <p className="text-xs">Đang tải hồ sơ bệnh án chi tiết...</p>
                  </div>
                ) : (
                  <>
                    {/* TAB 1: BỆNH ÁN & ĐỢT KHÁM */}
                    {activeTab === 'records' && (
                      <div className="space-y-6">
                        {(!selectedPatient.visits || selectedPatient.visits.length === 0) ? (
                          <div className="text-center py-12 text-slate-400">
                            <FileText className="mx-auto mb-2 text-slate-300" size={36} />
                            <p className="text-sm font-semibold text-slate-600">Chưa có đợt khám nào</p>
                            <p className="text-xs text-slate-400 mt-1">Bấm nút "Tạo đợt khám mới" ở trên để ghi nhận bệnh án cho bệnh nhân.</p>
                          </div>
                        ) : (
                          selectedPatient.visits.map((v: any, index: number) => {
                            const mr = v.medicalRecord;
                            const visitDateStr = new Date(v.visitDate).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            });

                            return (
                              <div
                                key={v.id}
                                className="border border-slate-200/90 rounded-2xl p-5 hover:border-blue-300 transition-colors shadow-2xs bg-white relative overflow-hidden"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
                                      #{selectedPatient.visits.length - index}
                                    </div>
                                    <div>
                                      <h3 className="text-sm font-bold text-slate-900">
                                        Đợt khám ngày {visitDateStr}
                                      </h3>
                                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                        <span>BS: <strong>{v.employee?.fullName || 'Chưa phân công'}</strong></span>
                                        <span>•</span>
                                        <span>Phòng: {v.room?.name || 'Khám tổng quát'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      v.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                      {v.status || 'Đang khám'}
                                    </span>

                                    <button
                                      onClick={() => handleOpenEditRecord(v)}
                                      className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                    >
                                      <Edit3 size={13} /> Sửa bệnh án
                                    </button>
                                  </div>
                                </div>

                                {/* Nội dung chẩn đoán */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                  <div className="p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
                                    <span className="font-bold text-slate-600 block mb-1 uppercase tracking-wider text-[11px]">
                                      Chẩn đoán sơ bộ
                                    </span>
                                    <p className="text-slate-800 text-sm font-medium">
                                      {mr?.preliminaryDiagnosis || 'Chưa ghi nhận chẩn đoán sơ bộ.'}
                                    </p>
                                  </div>

                                  <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100">
                                    <span className="font-bold text-blue-800 block mb-1 uppercase tracking-wider text-[11px]">
                                      Chẩn đoán xác định
                                    </span>
                                    <p className="text-blue-950 text-sm font-semibold">
                                      {mr?.finalDiagnosis || 'Chưa ghi nhận chẩn đoán xác định.'}
                                    </p>
                                  </div>
                                </div>

                                {/* Ghi chú lâm sàng */}
                                {mr?.notes && (
                                  <div className="mt-3 p-3 bg-amber-50/40 rounded-xl border border-amber-100 text-xs">
                                    <span className="font-bold text-amber-900 block mb-0.5">Lời dặn & Diễn tiến lâm sàng:</span>
                                    <p className="text-slate-700 whitespace-pre-line">{mr.notes}</p>
                                  </div>
                                )}

                                {/* Tóm tắt dịch vụ & đơn thuốc đi kèm đợt khám */}
                                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                  <span>Chỉ định CLS: <strong className="text-slate-800">{v.orders?.length || 0}</strong></span>
                                  <span>Đơn thuốc: <strong className="text-slate-800">{v.prescriptions?.length || 0}</strong></span>
                                  <span>Phác đồ: <strong className="text-slate-800">{v.treatmentPlans?.length || 0}</strong></span>
                                  <span>Ảnh chụp: <strong className="text-slate-800">{v.treatmentImages?.length || 0}</strong></span>
                                  <Link
                                    href={`/bacsi/treatments?visitId=${v.id}`}
                                    className="ml-auto text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                                  >
                                    Đến ca điều trị <ChevronRight size={14} />
                                  </Link>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* TAB 2: PHÁC ĐỒ ĐIỀU TRỊ */}
                    {activeTab === 'plans' && (
                      <div className="space-y-4">
                        {(!selectedPatient.treatmentPlans || selectedPatient.treatmentPlans.length === 0) ? (
                          <div className="text-center py-12 text-slate-400">
                            <Activity className="mx-auto mb-2 text-slate-300" size={36} />
                            <p className="text-sm font-semibold text-slate-600">Chưa có phác đồ điều trị nào</p>
                            <p className="text-xs text-slate-400 mt-1">Phác đồ sẽ hiển thị khi được lập tại phân hệ Điều trị.</p>
                          </div>
                        ) : (
                          selectedPatient.treatmentPlans.map((plan: any) => (
                            <div key={plan.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 text-sm">{plan.name}</h3>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                      Phiên bản {plan.version}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500">Trạng thái: <strong>{plan.status}</strong></p>
                                </div>
                                <Link
                                  href={`/bacsi/treatments?visitId=${plan.visitId}`}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                                >
                                  Mở ca điều trị <ChevronRight size={13} />
                                </Link>
                              </div>

                              {/* Danh sách các giai đoạn & bước */}
                              {plan.stages && plan.stages.length > 0 && (
                                <div className="space-y-3 mt-4 pt-3 border-t border-slate-100">
                                  {plan.stages.map((stg: any) => (
                                    <div key={stg.id} className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/60">
                                      <h4 className="text-xs font-bold text-slate-700 mb-2">Giai đoạn: {stg.name}</h4>
                                      <div className="space-y-1.5">
                                        {stg.steps?.map((step: any) => (
                                          <div key={step.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/80 text-xs">
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[10px] flex items-center justify-center font-bold">
                                                {step.orderNo}
                                              </span>
                                              <span className="font-medium text-slate-800">{step.content}</span>
                                            </div>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                                              step.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                              {step.status}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* TAB 3: ĐƠN THUỐC */}
                    {activeTab === 'prescriptions' && (
                      <div className="space-y-4">
                        {(() => {
                          const allPrescriptions = selectedPatient.visits?.flatMap((v: any) => v.prescriptions || []) || [];
                          if (allPrescriptions.length === 0) {
                            return (
                              <div className="text-center py-12 text-slate-400">
                                <Pill className="mx-auto mb-2 text-slate-300" size={36} />
                                <p className="text-sm font-semibold text-slate-600">Chưa có đơn thuốc nào</p>
                              </div>
                            );
                          }
                          return allPrescriptions.map((rx: any) => (
                            <div key={rx.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
                              <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-100">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900 text-sm">Đơn thuốc: {rx.code || ('RX-' + rx.id.slice(0, 6).toUpperCase())}</h3>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold border border-purple-200">
                                      {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('vi-VN') : 'Đợt khám'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600">Chẩn đoán: <strong>{rx.diagnosis || 'Theo bệnh án'}</strong></p>
                                </div>
                              </div>

                              {/* Bảng thuốc trong đơn */}
                              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                    <tr>
                                      <th className="py-2.5 px-3">Tên thuốc</th>
                                      <th className="py-2.5 px-3 text-center">Số lượng</th>
                                      <th className="py-2.5 px-3">Đơn vị</th>
                                      <th className="py-2.5 px-3">Liều dùng & Cách dùng</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {rx.items?.map((item: any) => (
                                      <tr key={item.id} className="hover:bg-slate-50/60">
                                        <td className="py-2.5 px-3 font-semibold text-slate-800">{item.medicine?.name || 'Thuốc'}</td>
                                        <td className="py-2.5 px-3 text-center font-bold text-blue-700">{item.quantity}</td>
                                        <td className="py-2.5 px-3 text-slate-600">{item.unit || item.medicine?.unit}</td>
                                        <td className="py-2.5 px-3 text-slate-700">{item.dosage || item.instructions || 'Theo chỉ định của bác sĩ'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* TAB 4: CẬN LÂM SÀNG */}
                    {activeTab === 'orders' && (
                      <div className="space-y-4">
                        {(() => {
                          const allOrders = selectedPatient.visits?.flatMap((v: any) => v.orders || []) || [];
                          if (allOrders.length === 0) {
                            return (
                              <div className="text-center py-12 text-slate-400">
                                <Stethoscope className="mx-auto mb-2 text-slate-300" size={36} />
                                <p className="text-sm font-semibold text-slate-600">Chưa có chỉ định cận lâm sàng nào</p>
                              </div>
                            );
                          }
                          return allOrders.map((ord: any) => (
                            <div key={ord.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-2xs">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-bold text-slate-900 text-sm">
                                    {ord.service?.name || ord.orderType || 'Chỉ định CLS'}
                                  </h3>
                                  <p className="text-xs text-slate-500">
                                    Bác sĩ chỉ định: <strong>{ord.orderedBy?.fullName || 'BS. Chuyên khoa'}</strong> • Ngày: {new Date(ord.orderedAt || ord.createdAt || Date.now()).toLocaleDateString('vi-VN')}
                                  </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {ord.status || 'Đã có kết quả'}
                                </span>
                              </div>

                              {/* Kết quả xét nghiệm hoặc soi da */}
                              {ord.imagingResults && ord.imagingResults.length > 0 && (
                                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                                  <span className="font-bold text-slate-700">Kết quả hình ảnh soi da:</span>
                                  {ord.imagingResults.map((im: any) => (
                                    <p key={im.id} className="text-slate-800">
                                      • {im.findings || 'Da bình thường, tuyến bã hoạt động mức trung bình.'}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* TAB 5: HÌNH ẢNH ĐIỀU TRỊ TRƯỚC / SAU */}
                    {activeTab === 'images' && (
                      <div>
                        {(() => {
                          const allImages = selectedPatient.visits?.flatMap((v: any) => v.treatmentImages || []) || [];
                          if (allImages.length === 0) {
                            return (
                              <div className="text-center py-12 text-slate-400">
                                <ImageIcon className="mx-auto mb-2 text-slate-300" size={36} />
                                <p className="text-sm font-semibold text-slate-600">Chưa có hình ảnh lâm sàng da nào</p>
                                <p className="text-xs text-slate-400 mt-1">Ảnh sẽ được chụp và tải lên trong các ca thủ thuật da liễu.</p>
                              </div>
                            );
                          }
                          return (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {allImages.map((img: any) => (
                                <div key={img.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs group">
                                  <div className="aspect-square bg-slate-100 flex items-center justify-center relative overflow-hidden">
                                    <img
                                      src={img.imageUrl}
                                      alt="Ảnh điều trị"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e: any) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none">
                                      <ImageIcon size={32} />
                                    </div>
                                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium backdrop-blur-xs">
                                      {img.angle || 'Chính diện'}
                                    </span>
                                  </div>
                                  <div className="p-2.5 bg-white text-xs">
                                    <p className="font-semibold text-slate-800 truncate">{img.tags || 'Ảnh trước điều trị'}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {new Date(img.createdAt).toLocaleDateString('vi-VN')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* TAB 6: VIỆN PHÍ & HÓA ĐƠN */}
                    {activeTab === 'billing' && (
                      <div className="space-y-4">
                        {(() => {
                          const allInvoices = selectedPatient.visits?.flatMap((v: any) => v.invoices || []) || [];
                          if (allInvoices.length === 0) {
                            return (
                              <div className="text-center py-12 text-slate-400">
                                <CreditCard className="mx-auto mb-2 text-slate-300" size={36} />
                                <p className="text-sm font-semibold text-slate-600">Chưa có hóa đơn nào</p>
                              </div>
                            );
                          }
                          return (
                            <div className="overflow-x-auto rounded-xl border border-slate-200/90">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                                  <tr>
                                    <th className="py-3 px-4">Mã hóa đơn</th>
                                    <th className="py-3 px-4">Ngày tạo</th>
                                    <th className="py-3 px-4 text-right">Tổng tiền</th>
                                    <th className="py-3 px-4 text-center">Trạng thái</th>
                                    <th className="py-3 px-4">Thanh toán</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {allInvoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/60">
                                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">#{inv.id.slice(0, 8)}</td>
                                      <td className="py-3 px-4 text-slate-600">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('vi-VN') : 'Đợt khám'}</td>
                                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                                        {Number(inv.total ?? inv.totalAmount ?? 0).toLocaleString('vi-VN')} đ
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                          inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                        }`}>
                                          {inv.status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                                        </span>
                                      </td>
                                      <td className="py-3 px-4 text-slate-600">
                                        {inv.payments?.[0]?.method || 'Tiền mặt / QR'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
            <User className="mx-auto mb-3 text-slate-300" size={48} />
            <h3 className="text-base font-bold text-slate-700 mb-1">Chưa chọn bệnh nhân</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Vui lòng chọn một bệnh nhân từ danh sách bên trái hoặc nhấn nút "Thêm BN" để bắt đầu theo dõi hồ sơ bệnh án.
            </p>
          </div>
        )}
      </div>

      {/* MODAL: THÊM BỆNH NHÂN MỚI */}
      {showAddPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <User size={18} className="text-blue-600" /> Thêm bệnh nhân mới
              </h3>
              <button onClick={() => setShowAddPatientModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreatePatientSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
                <input
                  required
                  type="text"
                  placeholder="VD: Nguyễn Thị Lan Anh"
                  value={newPatientForm.fullName}
                  onChange={e => setNewPatientForm({ ...newPatientForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="VD: 0912345678"
                  value={newPatientForm.phone}
                  onChange={e => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={newPatientForm.dateOfBirth}
                  onChange={e => setNewPatientForm({ ...newPatientForm, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingPatient}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPatient && <Loader2 size={13} className="animate-spin" />} Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TẠO ĐỢT KHÁM MỚI (CHECK-IN) */}
      {showQuickVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck size={18} className="text-emerald-600" /> Tạo đợt khám mới cho {selectedPatient.fullName}
              </h3>
              <button onClick={() => setShowQuickVisitModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateQuickVisitSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chẩn đoán sơ bộ</label>
                <input
                  type="text"
                  placeholder="VD: Mụn trứng cá viêm mức độ vừa, sẹo thâm..."
                  value={quickVisitForm.preliminaryDiagnosis}
                  onChange={e => setQuickVisitForm({ ...quickVisitForm, preliminaryDiagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chẩn đoán xác định</label>
                <input
                  type="text"
                  placeholder="VD: Acne vulgaris L70.0"
                  value={quickVisitForm.finalDiagnosis}
                  onChange={e => setQuickVisitForm({ ...quickVisitForm, finalDiagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú & Diễn tiến lâm sàng</label>
                <textarea
                  rows={3}
                  placeholder="Ghi nhận tình trạng da, triệu chứng ngứa, rát..."
                  value={quickVisitForm.notes}
                  onChange={e => setQuickVisitForm({ ...quickVisitForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickVisitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingVisit}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingVisit && <Loader2 size={13} className="animate-spin" />} Bắt đầu đợt khám
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHỈNH SỬA BỆNH ÁN CỦA ĐỢT KHÁM */}
      {showEditRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-blue-600" /> Cập nhật bệnh án đợt khám
              </h3>
              <button onClick={() => setShowEditRecordModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveMedicalRecordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chẩn đoán sơ bộ</label>
                <input
                  type="text"
                  value={recordForm.preliminaryDiagnosis}
                  onChange={e => setRecordForm({ ...recordForm, preliminaryDiagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Chẩn đoán xác định</label>
                <input
                  type="text"
                  value={recordForm.finalDiagnosis}
                  onChange={e => setRecordForm({ ...recordForm, finalDiagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-semibold text-blue-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Lời dặn & Diễn tiến lâm sàng</label>
                <textarea
                  rows={4}
                  value={recordForm.notes}
                  onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditRecordModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingRecord}
                  className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingRecord && <Loader2 size={13} className="animate-spin" />} Cập nhật bệnh án
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM DỊ ỨNG */}
      {showAddAllergyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" /> Thêm ghi nhận dị ứng
              </h3>
              <button onClick={() => setShowAddAllergyModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddAllergySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tác nhân dị ứng *</label>
                <input
                  required
                  type="text"
                  placeholder="VD: Penicillin, Tretinoin, Cồn, Hải sản..."
                  value={allergyForm.substance}
                  onChange={e => setAllergyForm({ ...allergyForm, substance: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mức độ nghiêm trọng</label>
                <select
                  value={allergyForm.severity}
                  onChange={e => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none bg-white"
                >
                  <option value="Nhẹ">Nhẹ (Mẩn ngứa thoáng qua)</option>
                  <option value="Vừa">Vừa (Phát ban, sưng nề)</option>
                  <option value="Nặng / Phản vệ">Nặng / Phản vệ (Khó thở, sốc)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Biểu hiện / Phản ứng cụ thể</label>
                <input
                  type="text"
                  placeholder="VD: Nổi mề đay toàn thân, ngứa rát..."
                  value={allergyForm.reaction}
                  onChange={e => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAllergyModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingAllergy}
                  className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingAllergy && <Loader2 size={13} className="animate-spin" />} Lưu cảnh báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM TIỀN SỬ BỆNH */}
      {showAddHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse size={18} className="text-amber-600" /> Thêm tiền sử bệnh lý
              </h3>
              <button onClick={() => setShowAddHistoryModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddHistorySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Loại tiền sử</label>
                <select
                  value={historyForm.type}
                  onChange={e => setHistoryForm({ ...historyForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-white"
                >
                  <option value="Bản thân">Bản thân</option>
                  <option value="Gia đình">Gia đình</option>
                  <option value="Sẹo lồi / Tăng sắc tố">Sẹo lồi / Tăng sắc tố sau viêm</option>
                  <option value="Điều trị laser / peel trước đây">Điều trị thẩm mỹ trước đây</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung tiền sử *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="VD: Cơ địa sẹo lồi khi có vết thương hở, từng điều trị mụn bằng Isotretinoin cách đây 6 tháng..."
                  value={historyForm.content}
                  onChange={e => setHistoryForm({ ...historyForm, content: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddHistoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingHistory}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingHistory && <Loader2 size={13} className="animate-spin" />} Lưu tiền sử
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
