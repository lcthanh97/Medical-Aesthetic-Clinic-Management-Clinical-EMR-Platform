'use client';

import React, { useRef, useState } from 'react';
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
  getPatients,
  saveMedicalRecord,
  addPatientAllergy,
  addPatientHistory,
  createQuickVisit,
  getPatientFullEMR,
  getTreatmentImageTimeline,
  getTreatmentImageDetails,
  compareTreatmentImages,
} from '../actions';

interface EmrPanelProps {
  initialPatients: any[];
  initialSelectedPatient?: any;
  canWrite?: boolean;
  canReadImages?: boolean;
  canReadClinicalOrders?: boolean;
  canReadPrescriptions?: boolean;
  canReadTreatmentPlans?: boolean;
  imagesOnly?: boolean;
  initialActiveTab?: 'records' | 'plans' | 'prescriptions' | 'orders' | 'images' | 'billing';
  initialTreatmentImages?: any[];
  initialTreatmentImageError?: string;
}

export function EmrPanel({
  initialPatients = [], initialSelectedPatient, canWrite = false,
    canReadImages = false, canReadClinicalOrders = false, canReadPrescriptions = false, canReadTreatmentPlans = false,
    imagesOnly = false, initialActiveTab = 'records', initialTreatmentImages = [], initialTreatmentImageError = '',
}: EmrPanelProps) {
  const [patients, setPatients] = useState<any[]>(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialSelectedPatient?.id || initialPatients[0]?.id || ''
  );
  const [selectedPatient, setSelectedPatient] = useState<any>(
    initialSelectedPatient || (initialPatients.length > 0 ? initialPatients[0] : null)
  );
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailLoadError, setDetailLoadError] = useState(false);
  const detailRequestId = useRef(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MULTIPLE_VISITS'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshingPatients, setIsRefreshingPatients] = useState(false);
  const [patientListError, setPatientListError] = useState('');
  const patientPageSize = 6;
  const [activeTab, setActiveTab] = useState<'records' | 'plans' | 'prescriptions' | 'orders' | 'images' | 'billing'>(initialActiveTab);
  const [treatmentImages, setTreatmentImages] = useState<any[]>(initialTreatmentImages);
  const [treatmentImageOptions, setTreatmentImageOptions] = useState<any[]>(initialTreatmentImages);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(initialTreatmentImageError);
  const [imageFilters, setImageFilters] = useState({ visitId: '', planId: '', sessionId: '', phase: '', imageType: '', bodyArea: '', from: '', to: '' });
  const [imageCurrentPage, setImageCurrentPage] = useState(1);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [compareIds, setCompareIds] = useState<[string, string]>(['', '']);
  const [comparison, setComparison] = useState<any>(null);
  const [comparisonError, setComparisonError] = useState('');

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
    const requestId = ++detailRequestId.current;
    setExpandedVisitId(null);
    setSelectedPatientId(patientId);
    setSelectedPatient(null);
    setTreatmentImages([]);
    setTreatmentImageOptions([]);
    setSelectedImage(null);
    setComparison(null);
    setCompareIds(['', '']);
    setImageLoadError('');
    setDetailLoadError(false);
    setIsLoadingDetail(true);
    try {
      if (imagesOnly) {
        const patient = patients.find((item) => item.id === patientId);
        if (!patient || !canReadImages) {
          setDetailLoadError(true);
          setIsLoadingDetail(false);
          return;
        }
        setSelectedPatient(patient);
        setIsLoadingImages(true);
        const result = await getTreatmentImageTimeline(patientId);
        if (requestId !== detailRequestId.current) return;
        if (result.success) {
          setTreatmentImages(result.data || []);
          setTreatmentImageOptions(result.data || []);
          setImageCurrentPage(1);
        } else {
          setTreatmentImages([]);
          setImageLoadError(result.error || 'Không thể tải timeline ảnh.');
        }
        setIsLoadingImages(false);
        setIsLoadingDetail(false);
        return;
      }
      const res = await getPatientFullEMR(patientId);
      if (requestId !== detailRequestId.current) return;
      if (res.success && res.data) {
        setSelectedPatient(res.data);
      } else {
        setDetailLoadError(true);
      }
    } catch {
      if (requestId === detailRequestId.current) setDetailLoadError(true);
    } finally {
      if (requestId === detailRequestId.current) {
        setIsLoadingDetail(false);
        if (imagesOnly) setIsLoadingImages(false);
      }
    }
  };

  const handleRefreshPatients = async () => {
    setIsRefreshingPatients(true);
    setPatientListError('');
    try {
      const result = await getPatients();
      if (!result.success) {
        setPatientListError(result.error || 'Không thể làm mới danh sách hồ sơ.');
        return;
      }
      const refreshedPatients = result.data || [];
      setPatients(refreshedPatients);
      setCurrentPage(1);
      const nextSelected = refreshedPatients.find((patient: any) => patient.id === selectedPatientId) || refreshedPatients[0];
      if (nextSelected) await handleSelectPatient(nextSelected.id);
      else {
        setSelectedPatientId('');
        setSelectedPatient(null);
      }
    } catch {
      setPatientListError('Không thể làm mới danh sách hồ sơ. Vui lòng thử lại.');
    } finally {
      setIsRefreshingPatients(false);
    }
  };

  const loadTreatmentImages = async (filters = imageFilters) => {
    if (!selectedPatientId) return;
    setIsLoadingImages(true);
    setImageLoadError('');
    setSelectedImage(null);
    setComparison(null);
    setComparisonError('');
    try {
      const res = await getTreatmentImageTimeline(selectedPatientId, Object.fromEntries(
        Object.entries(filters).filter(([, value]) => Boolean(value)),
      ) as typeof imageFilters);
      if (res.success) {
        setTreatmentImages(res.data || []);
        setImageCurrentPage(1);
        if (Object.values(filters).every((value) => !value)) setTreatmentImageOptions(res.data || []);
      }
      else {
        setTreatmentImages([]);
        setImageLoadError(res.error || 'Không thể tải timeline ảnh.');
      }
    } catch {
      setTreatmentImages([]);
      setImageLoadError('Không thể tải timeline ảnh.');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleSelectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (tab === 'images') void loadTreatmentImages();
  };

  const handleOpenTreatmentImage = async (imageId: string) => {
    try {
      const result = await getTreatmentImageDetails(selectedPatientId, imageId);
      if (result.success) setSelectedImage(result.data);
      else setImageLoadError(result.error || 'Không thể mở metadata hình ảnh.');
    } catch {
      setImageLoadError('Không thể mở metadata hình ảnh.');
    }
  };

  const handleCompareTreatmentImages = async () => {
    setComparison(null);
    setComparisonError('');
    try {
      const result = await compareTreatmentImages(selectedPatientId, compareIds);
      if (result.success) setComparison(result.data);
      else setComparisonError(result.error || 'Không thể so sánh hai hình ảnh đã chọn.');
    } catch {
      setComparisonError('Không thể so sánh hai hình ảnh đã chọn.');
    }
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
    const originalRecord = editingRecordVisit.medicalRecord;
    const expectedRecord = originalRecord
      ? {
          preliminaryDiagnosis: originalRecord.preliminaryDiagnosis ?? null,
          finalDiagnosis: originalRecord.finalDiagnosis ?? null,
          notes: originalRecord.notes ?? null
        }
      : null;
    const res = await saveMedicalRecord(editingRecordVisit.id, recordForm, expectedRecord);
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

  // Lọc danh sách bệnh nhân
  const filteredPatients = patients.filter(p => {
    const q = searchTerm.toLocaleLowerCase('vi-VN');
    const nameMatch = (p.fullName || '').toLocaleLowerCase('vi-VN').includes(q);
    const codeMatch = (p.patientCode || '').toLocaleLowerCase('vi-VN').includes(q);
    const phoneMatch = (p.phone || '').toLocaleLowerCase('vi-VN').includes(q);
    const matchesSearch = nameMatch || codeMatch || phoneMatch;

    if (!matchesSearch) return false;

    if (filterType === 'MULTIPLE_VISITS') {
      return (p.visits?.length || 0) > 1;
    }

    return true;
  });
  const patientPageCount = Math.max(1, Math.ceil(filteredPatients.length / patientPageSize));
  const visiblePatients = filteredPatients.slice((currentPage - 1) * patientPageSize, currentPage * patientPageSize);
  const imagePageSize = 9;
  const imagePageCount = Math.max(1, Math.ceil(treatmentImages.length / imagePageSize));
  const visibleTreatmentImages = treatmentImages.slice((imageCurrentPage - 1) * imagePageSize, imageCurrentPage * imagePageSize);
  const visibleTabs: Array<[typeof activeTab, string]> = imagesOnly ? [['images', 'Ảnh theo dõi']] : [['records', 'Tổng hợp bệnh án']];
  if (!imagesOnly && canReadTreatmentPlans) visibleTabs.push(['plans', 'Phác đồ điều trị']);
  if (!imagesOnly && canReadPrescriptions) visibleTabs.push(['prescriptions', 'Đơn thuốc']);
  if (!imagesOnly && canReadImages) visibleTabs.push(['orders', 'Kết quả cận lâm sàng'], ['images', 'Ảnh theo dõi']);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* CỘT TRÁI: DANH SÁCH BỆNH NHÂN (GỌN GÀNG CÓ THANH TRƯỢT & FONT CHỮ DỄ ĐỌC) */}
      <div className="flex w-full flex-shrink-0 flex-col overflow-hidden rounded-xl border border-[#e1e9f2] bg-white shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-118px)] lg:w-[340px] xl:w-[365px]">
        {/* Header danh sách cố định */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-[#20334b]">
                <FileText className="text-blue-600" size={18} />
                Hồ sơ được phân công ({filteredPatients.length})
              </h2>
            </div>
            <button type="button" onClick={() => void handleRefreshPatients()} disabled={isRefreshingPatients} className="inline-flex items-center gap-1.5 rounded-md border border-[#e1e9f2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#235f9e] hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60" aria-label="Làm mới danh sách hồ sơ">
              <Loader2 size={14} className={isRefreshingPatients ? 'animate-spin' : ''} />
              {isRefreshingPatients ? 'Đang tải' : 'Làm mới'}
            </button>
          </div>

          {/* Ô tìm kiếm vừa vặn, dễ đọc */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Tìm tên, mã hồ sơ hoặc số điện thoại..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>

          {/* Bộ lọc nhanh rõ ràng */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
            <button
              onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'ALL' ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => { setFilterType('MULTIPLE_VISITS'); setCurrentPage(1); }}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filterType === 'MULTIPLE_VISITS' ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-200' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Nhiều lượt khám
            </button>
          </div>
        </div>

        {/* Danh sách thẻ bệnh nhân có THANH TRƯỢT DỄ DÀNG */}
        {patientListError && <div role="alert" className="mx-3 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{patientListError}</div>}
        <div className="max-h-[36rem] flex-1 space-y-1.5 overflow-y-auto p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 lg:max-h-none">
          {filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <User className="mx-auto mb-2 text-slate-300" size={32} />
              <p className="text-sm">Không tìm thấy bệnh nhân</p>
            </div>
          ) : (
            visiblePatients.map(p => {
              const isSelected = selectedPatientId === p.id;
              const visitCount = p._count?.visits ?? p.visits?.length ?? 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPatient(p.id)}
                  aria-pressed={isSelected}
                  className={`w-full px-3 py-2.5 text-left rounded-lg cursor-pointer transition-all border ${
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

                      {/* Dòng 2: Số lượt khám đã được phân công */}
                      <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500">
                        <span className="truncate">{p.phone || 'Chưa có số điện thoại'}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {visitCount} đợt
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[#e1e9f2] px-3 py-2 text-xs text-[#6c7e93]">
          <span>{filteredPatients.length === 0 ? 'Không có hồ sơ' : `Trang ${currentPage}/${patientPageCount}`}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1} aria-label="Trang trước" className="rounded border border-[#e1e9f2] px-2 py-1 disabled:opacity-40">‹</button>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(patientPageCount, page + 1))} disabled={currentPage >= patientPageCount} aria-label="Trang sau" className="rounded border border-[#e1e9f2] px-2 py-1 disabled:opacity-40">›</button>
          </div>
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
                        <Activity size={14} className="text-emerald-500" />
                <span className="font-semibold text-[#235f9e]">{selectedPatient.visits?.length || 0} lượt khám được phân công</span>
                      </div>
              <span>Mã hồ sơ {selectedPatient.patientCode}</span>
              {selectedPatient.dateOfBirth && <span>Ngày sinh {new Date(selectedPatient.dateOfBirth).toLocaleDateString('vi-VN')}</span>}
              {selectedPatient.phone && <span>Điện thoại {selectedPatient.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Nút hành động trên Header */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  {imagesOnly && <Link href={`/bacsi/emr?patientId=${encodeURIComponent(selectedPatient.id)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700">Hồ sơ bệnh nhân</Link>}
                  {imagesOnly && selectedPatient.visits?.[0]?.id && <>
                    <Link href={`/bacsi/treatments?visitId=${encodeURIComponent(selectedPatient.visits[0].id)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700">Phác đồ điều trị</Link>
                    <Link href={`/bacsi/treatment-sessions?visitId=${encodeURIComponent(selectedPatient.visits[0].id)}`} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-700">Buổi điều trị</Link>
                  </>}
                  {!imagesOnly && <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                    title="In bệnh án"
                  >
                    <Printer size={16} /> In EMR
                  </button>}
                </div>
              </div>

              {selectedPatient.visits?.[0] && (
                <div className="mt-5 grid gap-3 border-t border-[#e1e9f2] pt-4 sm:grid-cols-3">
                  <div><p className="text-[11px] text-[#6c7e93]">Lượt khám gần nhất được phân công</p><p className="mt-1 text-sm font-semibold text-[#20334b]">{new Date(selectedPatient.visits[0].visitDate).toLocaleString('vi-VN')}</p></div>
                  <div><p className="text-[11px] text-[#6c7e93]">Phòng / Khoa</p><p className="mt-1 text-sm font-semibold text-[#20334b]">{selectedPatient.visits[0].room?.name || 'Chưa ghi nhận'}{selectedPatient.visits[0].room?.department?.name ? ` · ${selectedPatient.visits[0].room.department.name}` : ''}</p></div>
                  <div><p className="text-[11px] text-[#6c7e93]">Trạng thái Visit</p><p className="mt-1 text-sm font-semibold text-[#20334b]">{selectedPatient.visits[0].status}</p></div>
                </div>
              )}
              <p className="mt-4 rounded-md bg-[#f7fafd] px-3 py-2 text-xs text-[#6c7e93]">Dị ứng và tiền sử bệnh chưa hiển thị vì phạm vi truy cập dữ liệu cấp bệnh nhân chưa được phê duyệt.</p>
            </div>

            {/* 2. TABS ĐIỀU HƯỚNG EMR */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
              <div className="border-b border-slate-200/80 bg-slate-50/60 px-4 py-3.5 text-sm font-bold text-blue-700">
                <FileText className="mr-2 inline-block" size={17} />Bệnh án & Visit được phân công ({selectedPatient.visits?.length || 0})
              </div>

              {/* NỘI DUNG TỪNG TAB */}
              <nav aria-label="Các phân hệ EMR" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 py-2">
                {visibleTabs.map(([tab, label]) => (
                  <button key={tab} type="button" onClick={() => handleSelectTab(tab)}
                    aria-current={activeTab === tab ? 'page' : undefined}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {label}
                  </button>
                ))}
              </nav>

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
                            <p className="text-xs text-slate-400 mt-1">Bấm nút &quot;Tạo đợt khám mới&quot; ở trên để ghi nhận bệnh án cho bệnh nhân.</p>
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
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                      v.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                                    }`}>
                                      {v.status || 'Đang khám'}
                                    </span>

                                    {v.canWrite && (
                                      <button
                                        onClick={() => handleOpenEditRecord(v)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                                      >
                                        <Edit3 size={13} /> Sửa bệnh án
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setExpandedVisitId((current) => current === v.id ? null : v.id)}
                                      aria-expanded={expandedVisitId === v.id}
                                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                    >
                                      <FileText size={13} /> {expandedVisitId === v.id ? 'Ẩn chi tiết' : 'Xem chi tiết'}
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

                                {expandedVisitId === v.id && (
                                  <section className="mt-4 space-y-4 border-t border-slate-200 pt-4" aria-label="Chi tiết lượt khám chỉ đọc">
                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                      <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Bác sĩ phụ trách</p>
                                        <p className="mt-1 font-semibold text-slate-800">{v.employee?.fullName || 'Chưa ghi nhận'}</p>
                                      </div>
                                      <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Phòng / khoa</p>
                                        <p className="mt-1 font-semibold text-slate-800">{v.room?.name || 'Chưa ghi nhận'}{v.room?.department?.name ? ` · ${v.room.department.name}` : ''}</p>
                                      </div>
                                      <div className="rounded-lg bg-slate-50 p-3">
                                        <p className="text-xs text-slate-500">Mã lượt khám</p>
                                        <p className="mt-1 break-all font-semibold text-slate-800">{v.id}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                      <div className="rounded-xl border border-slate-200 p-4">
                                        <h4 className="mb-3 text-sm font-bold text-slate-900">Đơn thuốc trong lượt khám</h4>
                                        {!canReadPrescriptions ? (
                                          <p className="text-sm text-slate-500">Tài khoản hiện tại không có quyền xem đơn thuốc.</p>
                                        ) : !v.prescriptions?.length ? (
                                          <p className="text-sm text-slate-500">Không có đơn thuốc được phép hiển thị.</p>
                                        ) : (
                                          <div className="space-y-3">
                                            {v.prescriptions.map((prescription: any) => (
                                              <div key={prescription.id} className="rounded-lg bg-slate-50 p-3">
                                                <p className="text-xs font-semibold text-slate-600">Trạng thái: {prescription.status || 'Chưa ghi nhận'}</p>
                                                {prescription.items?.length ? (
                                                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                                                    {prescription.items.map((item: any) => (
                                                      <li key={item.id}>
                                                        <span className="font-medium">{item.medicine?.name || 'Thuốc'}</span>
                                                        {item.quantity != null && <span> · SL {item.quantity}{item.medicine?.unit ? ` ${item.medicine.unit}` : ''}</span>}
                                                        {item.dosage && <span> · {item.dosage}</span>}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                ) : <p className="mt-2 text-sm text-slate-500">Đơn chưa có thuốc.</p>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      <div className="rounded-xl border border-slate-200 p-4">
                                        <h4 className="mb-3 text-sm font-bold text-slate-900">Chỉ định và kết quả cận lâm sàng</h4>
                                        {!canReadClinicalOrders ? (
                                          <p className="text-sm text-slate-500">Tài khoản hiện tại không có quyền xem chỉ định và kết quả.</p>
                                        ) : !v.orders?.length ? (
                                          <p className="text-sm text-slate-500">Không có chỉ định được phép hiển thị.</p>
                                        ) : (
                                          <div className="space-y-3">
                                            {v.orders.map((order: any) => (
                                              <article key={order.id} className="rounded-lg bg-slate-50 p-3">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                  <p className="font-semibold text-slate-800">{order.service?.name || order.type || 'Chỉ định'}</p>
                                                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">{order.status || 'Chưa ghi nhận'}</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">{order.orderedAt ? new Date(order.orderedAt).toLocaleString('vi-VN') : ''}{order.orderedBy?.fullName ? ` · ${order.orderedBy.fullName}` : ''}</p>
                                                {!!order.labResults?.length && <ul className="mt-2 space-y-1 text-sm text-slate-700">{order.labResults.map((result: any) => <li key={result.id}><span className="font-medium">{result.testName}</span>: {result.result || 'Chưa có kết quả'}{result.unit ? ` ${result.unit}` : ''}</li>)}</ul>}
                                                {!!order.imagingResults?.length && <ul className="mt-2 space-y-1 text-sm text-slate-700">{order.imagingResults.map((result: any) => <li key={result.id}><span className="font-medium">{result.imagingType}</span>: {result.conclusion || 'Chưa có kết luận'}</li>)}</ul>}
                                              </article>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">Đây là hồ sơ lịch sử ở chế độ chỉ đọc. Mọi nội dung của lượt khám đã lưu được giữ nguyên.</p>
                                  </section>
                                )}

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
                                <span className="text-xs text-slate-500">Visit {plan.visitId.slice(0, 8)}</span>
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
                                  <p className="text-xs text-slate-600">Trạng thái: <strong>{rx.status || 'Chưa ghi nhận'}</strong></p>
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
                                    {ord.service?.name || ord.type || 'Chỉ định CLS'}
                                  </h3>
                                  <p className="text-xs text-slate-500">
                                    Bác sĩ chỉ định: <strong>{ord.orderedBy?.fullName || 'Chưa ghi nhận'}</strong> • Ngày: {new Date(ord.orderedAt).toLocaleDateString('vi-VN')}
                                  </p>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {ord.status || 'Đã có kết quả'}
                                </span>
                              </div>

                              {/* Kết quả xét nghiệm hoặc soi da */}
                              {ord.imagingResults?.length > 0 && <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs"><h4 className="font-bold text-slate-700">Kết quả hình ảnh</h4>{ord.imagingResults.map((im: any) => <p key={im.id} className="text-slate-800">{im.imagingType}: {im.conclusion || 'Chưa có kết luận được lưu.'}</p>)}</div>}
                              {ord.labResults?.length > 0 && <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 text-xs"><h4 className="font-bold text-slate-700">Kết quả xét nghiệm</h4>{ord.labResults.map((result: any) => <p key={result.id} className="text-slate-800">{result.testName}: {result.result}{result.unit ? ` ${result.unit}` : ''}</p>)}</div>}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* TAB 5: HÌNH ẢNH ĐIỀU TRỊ TRƯỚC / SAU */}
                    {activeTab === 'images' && (
                      <section className="space-y-5" aria-label="Timeline ảnh điều trị">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div><h2 className="text-lg font-bold text-slate-900">Timeline ảnh da liễu</h2><p className="text-xs text-slate-500">Chỉ gồm Visit được gán cho nhân viên đang đăng nhập. Kho lưu ảnh riêng tư chưa được xác minh nên màn hình chỉ hiển thị metadata.</p></div>
                          <button type="button" onClick={() => void loadTreatmentImages()} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Làm mới</button>
                        </div>
                        <form className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); void loadTreatmentImages(); }}>
                          {([
                            ['visitId', 'Visit'], ['planId', 'Kế hoạch'], ['sessionId', 'Phiên điều trị'], ['phase', 'Giai đoạn'], ['bodyArea', 'Vùng điều trị'], ['imageType', 'Loại ảnh'],
                          ] as const).map(([key, label]) => {
                            const values = [...new Set(treatmentImageOptions.map((image) => key === 'visitId' ? image.visitId : key === 'planId' ? image.planId : key === 'sessionId' ? image.sessionId : image[key]).filter(Boolean))];
                            return <label key={key} className="text-xs font-semibold text-slate-600">{label}<select value={imageFilters[key]} onChange={(event) => setImageFilters((current) => ({ ...current, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal"><option value="">Tất cả</option>{values.map((value) => <option key={value} value={value}>{key === 'planId' ? treatmentImageOptions.find((image) => image.planId === value)?.plan.name || value : key === 'sessionId' ? `Phiên ${treatmentImageOptions.find((image) => image.sessionId === value)?.session.sessionNo ?? value}` : value}</option>)}</select></label>;
                          })}
                          <label className="text-xs font-semibold text-slate-600">Từ ngày<input type="date" value={imageFilters.from} onChange={(event) => setImageFilters((current) => ({ ...current, from: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal" /></label>
                          <label className="text-xs font-semibold text-slate-600">Đến ngày<input type="date" value={imageFilters.to.slice(0, 10)} onChange={(event) => setImageFilters((current) => ({ ...current, to: event.target.value ? `${event.target.value}T23:59:59.999Z` : '' }))} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-normal" /></label>
                          <div className="flex items-end gap-2 md:col-span-4"><button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Lọc timeline</button><button type="button" onClick={() => { const cleared = { visitId: '', planId: '', sessionId: '', phase: '', imageType: '', bodyArea: '', from: '', to: '' }; setImageFilters(cleared); void loadTreatmentImages(cleared); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Xóa lọc</button></div>
                        </form>
                        {imageLoadError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{imageLoadError}</div>}
                        {isLoadingImages ? <div className="py-10 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" />Đang tải timeline…</div> : treatmentImages.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center"><ImageIcon className="mx-auto mb-2 text-slate-400" /><p className="font-semibold text-slate-700">Chưa có ảnh trong Visit được phân công</p><p className="mt-1 text-sm text-slate-500">Không có dữ liệu ảnh phù hợp với quyền truy cập và bộ lọc hiện tại.</p></div> : <>
                          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm"><span className="font-semibold text-blue-900">So sánh metadata:</span>{compareIds.map((id, index) => <select key={index} aria-label={`Ảnh so sánh ${index === 0 ? 'trái' : 'phải'}`} value={id} onChange={(event) => setCompareIds((current) => { const next: [string, string] = [...current]; next[index] = event.target.value; return next; })} className="min-w-44 rounded-lg border border-blue-200 bg-white px-2 py-2 text-xs"><option value="">Chọn ảnh {index === 0 ? 'trái' : 'phải'}</option>{treatmentImages.map((image) => <option key={image.id} value={image.id}>{new Date(image.capturedAt).toLocaleDateString('vi-VN')} · {image.phase} · {image.bodyArea || 'Chưa xác định vùng'}</option>)}</select>)}<button type="button" disabled={!compareIds[0] || !compareIds[1]} onClick={() => void handleCompareTreatmentImages()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">So sánh</button>{comparison && <button type="button" onClick={() => setComparison(null)} className="rounded-lg px-3 py-2 text-xs font-semibold text-blue-800">Thoát so sánh</button>}</div>
                          {comparisonError && <p role="alert" className="text-sm text-red-700">{comparisonError}</p>}
                          {comparison && <div className="space-y-3 rounded-xl border border-slate-200 p-4"><p className={`text-sm font-semibold ${comparison.sameBodyArea ? 'text-emerald-700' : 'text-amber-700'}`}>{comparison.sameBodyArea ? 'Hai metadata xác nhận cùng vùng điều trị.' : 'Cảnh báo: vùng điều trị khác nhau hoặc chưa đủ dữ liệu; không thể coi là ảnh tương đương.'} Việc so sánh không kết luận hiệu quả điều trị.</p><div className="grid gap-3 md:grid-cols-2">{comparison.images.map((image: any) => <div key={image.id} className="space-y-2"><div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100"><ImageIcon className="text-slate-400" /><img src={`/api/bacsi/images/${encodeURIComponent(image.id)}/content`} alt={`Ảnh đối chiếu ${image.phase} ${image.imageType}`} className="absolute inset-0 h-full w-full bg-white object-contain" onError={(event) => event.currentTarget.classList.add('hidden')} /></div><ImageMetadataCard image={image} /></div>)}</div></div>}
                          {selectedImage && <div className="rounded-xl border border-slate-300 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold text-slate-900">Chi tiết metadata ảnh</h3><button type="button" onClick={() => setSelectedImage(null)} className="text-sm font-semibold text-blue-700">Quay lại timeline</button></div><ImageMetadataCard image={selectedImage} /></div>}
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleTreatmentImages.map((image) => <article key={image.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="relative mb-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400"><div className="text-center"><ImageIcon className="mx-auto mb-2" size={34} /><span className="text-xs">Ảnh riêng tư · yêu cầu quyền xem</span></div><img src={`/api/bacsi/images/${encodeURIComponent(image.id)}/content`} alt={`Ảnh ${image.imageType} ${image.phase} chụp ngày ${new Date(image.capturedAt).toLocaleDateString('vi-VN')}`} loading="lazy" className="absolute inset-0 h-full w-full bg-white object-contain" onError={(event) => event.currentTarget.classList.add('hidden')} /></div><p className="font-semibold text-slate-900">{new Date(image.capturedAt).toLocaleString('vi-VN')}</p><p className="mt-1 text-sm text-slate-600">{image.phase} · {image.imageType}</p><p className="text-xs text-slate-500">{image.bodyArea || 'Chưa ghi vùng điều trị'} · {image.plan.name}{image.session ? ` · Phiên ${image.session.sessionNo}` : ''}</p><button type="button" onClick={() => void handleOpenTreatmentImage(image.id)} className="mt-3 text-sm font-semibold text-blue-700 hover:underline">Xem chi tiết</button></article>)}</div>
                          {imagePageCount > 1 && <nav aria-label="Phân trang ảnh theo dõi" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"><span>Trang {imageCurrentPage}/{imagePageCount} · {treatmentImages.length} metadata (tối đa 500 bản ghi)</span><div className="flex gap-2"><button type="button" onClick={() => setImageCurrentPage((page) => Math.max(1, page - 1))} disabled={imageCurrentPage <= 1} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Trước</button><button type="button" onClick={() => setImageCurrentPage((page) => Math.min(imagePageCount, page + 1))} disabled={imageCurrentPage >= imagePageCount} className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50">Sau</button></div></nav>}
                        </>}
                      </section>
                    )}                    {activeTab === 'billing' && (
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
          <div aria-live="polite" className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400">
            <User className="mx-auto mb-3 text-slate-300" size={48} />
            <h3 className="text-base font-bold text-slate-700 mb-1">
              {isLoadingDetail ? 'Đang tải hồ sơ bệnh án' : detailLoadError ? 'Không thể tải hồ sơ bệnh án' : 'Chưa chọn bệnh nhân'}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {isLoadingDetail
                ? 'Vui lòng chờ trong khi hệ thống tải hồ sơ.'
                : detailLoadError
                  ? 'Không hiển thị hồ sơ cũ. Vui lòng thử chọn lại bệnh nhân.'
                  : 'Vui lòng chọn một bệnh nhân từ danh sách bên trái hoặc nhấn nút "Thêm BN" để bắt đầu theo dõi hồ sơ bệnh án.'}
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

function ImageMetadataCard({ image }: { image: any }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
      <h4 className="font-semibold text-slate-900">{new Date(image.capturedAt).toLocaleString('vi-VN')}</h4>
      <dl className="mt-3 grid grid-cols-1 gap-2 text-slate-600 sm:grid-cols-2">
        <div><dt className="text-xs text-slate-400">Giai đoạn</dt><dd>{image.phase}</dd></div>
        <div><dt className="text-xs text-slate-400">Loại ảnh</dt><dd>{image.imageType}</dd></div>
        <div><dt className="text-xs text-slate-400">Vùng điều trị</dt><dd>{image.bodyArea || 'Chưa có dữ liệu'}</dd></div>
        <div><dt className="text-xs text-slate-400">Kế hoạch</dt><dd>{image.plan?.name || 'Không có dữ liệu'}</dd></div>
        <div><dt className="text-xs text-slate-400">Visit</dt><dd>{image.visitId}</dd></div>
        <div><dt className="text-xs text-slate-400">Phiên</dt><dd>{image.session ? `#${image.session.sessionNo}` : 'Không gắn phiên'}</dd></div>
      </dl>
      {image.description && <p className="mt-3 whitespace-pre-wrap border-t border-slate-100 pt-3 text-slate-700">{image.description}</p>}
      <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Tệp ảnh chưa được phân phối vì chưa xác minh storage riêng tư và kiểm tra quyền đọc nội dung.</p>
    </article>
  );
}
