'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { visitsApi } from '../api/visitsApi';
import { receptionApi } from '@/features/reception/api/receptionApi';
import { VisitTicketModal } from './VisitTicketModal';
import type { RoomQueueItem, VisitItem } from '../types/visits.types';
import type { PatientItem } from '@/features/reception/types/reception.types';

interface WalkInVisitFormProps {
  initialPatientId?: string;
  onSuccess?: (visit: VisitItem) => void;
}

export function WalkInVisitForm({ initialPatientId, onSuccess }: WalkInVisitFormProps) {
  // Patient search state
  const [patientQuery, setPatientQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PatientItem[]>([]);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);

  // Form inputs
  const [roomId, setRoomId] = useState('');
  const [visitType, setVisitType] = useState('NEW');
  const [reason, setReason] = useState('');
  const [receptionNote, setReceptionNote] = useState('');

  // Data sources
  const [rooms, setRooms] = useState<RoomQueueItem[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);

  // Submission & ticket state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdVisit, setCreatedVisit] = useState<VisitItem | null>(null);

  // Load rooms on mount
  useEffect(() => {
    async function loadRooms() {
      try {
        const res = await visitsApi.getRooms();
        if (res.success && res.data) {
          setRooms(res.data);
          if (res.data.length > 0) {
            setRoomId(res.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load rooms:', err);
      } finally {
        setIsLoadingRooms(false);
      }
    }
    loadRooms();
  }, []);

  // Pre-load initial patient if id provided
  useEffect(() => {
    if (!initialPatientId) return;
    async function loadInitialPatient() {
      try {
        const res = await receptionApi.getPatient(initialPatientId as string);
        if (res.success && res.data) {
          setSelectedPatient({
            id: res.data.id,
            patientCode: res.data.patientCode,
            fullName: res.data.fullName,
            phone: res.data.phone,
            allergies: res.data.allergies,
            histories: res.data.histories,
            visitsCount: res.data.visits?.length || 0,
            dateOfBirth: res.data.dateOfBirth,
          });
        }
      } catch (err) {
        console.error('Failed to fetch initial patient:', err);
      }
    }
    loadInitialPatient();
  }, [initialPatientId]);

  // Live patient search debounced (>= 2 chars)
  useEffect(() => {
    if (!patientQuery.trim() || patientQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingPatients(true);
      try {
        const res = await receptionApi.getPatients({
          search: patientQuery.trim(),
          limit: 6,
        });
        if (res.success && res.data?.items) {
          setSearchResults(res.data.items);
        }
      } catch (err) {
        console.error('Search patient error:', err);
      } finally {
        setIsSearchingPatients(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientQuery]);

  const selectedRoomObj = rooms.find((r) => r.id === roomId);

  const calculateAge = (dobString?: string | null) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const diffMs = Date.now() - dob.getTime();
    return Math.abs(new Date(diffMs).getUTCFullYear() - 1970);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedPatient) {
      setErrorMessage('Vui lòng tìm kiếm và chọn bệnh nhân đăng ký khám.');
      return;
    }
    if (!roomId) {
      setErrorMessage('Vui lòng chọn phòng khám tiếp nhận.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Vui lòng nhập lý do đến khám của bệnh nhân.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await visitsApi.createWalkInVisit({
        patientId: selectedPatient.id,
        roomId,
        visitType,
        reason: reason.trim(),
        receptionNote: receptionNote.trim() || undefined,
      });

      if (res.success && res.data) {
        setCreatedVisit(res.data);
        if (onSuccess) {
          onSuccess(res.data);
        }
      } else {
        setErrorMessage(res.message || 'Không thể tạo lượt khám. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setCreatedVisit(null);
    setSelectedPatient(null);
    setReason('');
    setReceptionNote('');
    setPatientQuery('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0e3a78]">Đăng ký lượt khám</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tiếp nhận bệnh nhân đến trực tiếp tại quầy và cấp số thứ tự khám (STT).
          </p>
        </div>
        <Link href="/reception/visits">
          <Button variant="secondary" size="sm">
            ← Xem bảng hàng đợi
          </Button>
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Ticket Modal popup after success */}
      <VisitTicketModal
        visit={createdVisit}
        isOpen={!!createdVisit}
        onClose={() => setCreatedVisit(null)}
        onNext={handleResetForNext}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION A — THÔNG TIN BỆNH NHÂN */}
        <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#e2ebf5] pb-3">
            <h3 className="font-bold text-[#0e3a78] text-sm flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f1fc] text-xs font-bold text-[#0e3a78]">
                A
              </span>
              Thông tin bệnh nhân đến quầy
            </h3>
            {selectedPatient && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientQuery('');
                }}
                className="text-xs text-slate-500 hover:text-rose-600"
              >
                Đổi bệnh nhân
              </Button>
            )}
          </div>

          {selectedPatient ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-[#e6f9f0]/40 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#0e3a78] text-white flex items-center justify-center font-bold text-sm uppercase shrink-0">
                  {selectedPatient.fullName.slice(0, 1)}
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm">{selectedPatient.fullName}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-0.5">
                    <span className="font-semibold text-[#0e3a78] bg-[#e8f1fc] px-1.5 py-0.2 rounded">
                      {selectedPatient.patientCode}
                    </span>
                    <span>SĐT: {selectedPatient.phone || 'Chưa cập nhật'}</span>
                    {selectedPatient.dateOfBirth && (
                      <span>• Tuổi: {calculateAge(selectedPatient.dateOfBirth)} tuổi</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                Đã chọn
              </span>
            </div>
          ) : (
            <div className="relative space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Tìm kiếm hồ sơ bệnh nhân (theo Tên, SĐT hoặc Mã BN) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  placeholder="Nhập tối thiểu 2 ký tự (VD: Lan Anh, 090123..., BN001...)"
                />
                {isSearchingPatients && (
                  <div className="absolute right-3 top-2.5">
                    <LoadingSpinner />
                  </div>
                )}
              </div>

              {/* Dropdown danh sách kết quả */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#e2ebf5] bg-white shadow-xl z-20 divide-y divide-slate-100">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchResults([]);
                        setPatientQuery('');
                      }}
                      className="p-3 hover:bg-[#f4f8fd] cursor-pointer transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{p.fullName}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Mã: <span className="text-[#0e3a78] font-semibold">{p.patientCode}</span> • SĐT: {p.phone || 'Chưa có'}
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" className="text-xs py-1">
                        Chọn
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Bệnh nhân chưa có hồ sơ?{' '}
                <Link
                  href="/reception/new"
                  target="_blank"
                  className="text-[#0e3a78] font-semibold underline hover:text-[#124794]"
                >
                  Tạo hồ sơ bệnh nhân mới tại đây ↗
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* SECTION B — THÔNG TIN LƯỢT KHÁM */}
        <div className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm space-y-4">
          <div className="border-b border-[#e2ebf5] pb-3">
            <h3 className="font-bold text-[#0e3a78] text-sm flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e8f1fc] text-xs font-bold text-[#0e3a78]">
                B
              </span>
              Thông tin lượt khám & Phân luồng phòng
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Loại lượt khám */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Loại lượt khám <span className="text-rose-500">*</span>
              </label>
              <select
                value={visitType}
                onChange={(e) => setVisitType(e.target.value)}
                className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-[#185adb] focus:outline-none focus:ring-2 focus:ring-[#185adb]/20 transition-all"
              >
                <option value="NEW">Khám mới ban đầu</option>
                <option value="RE_EXAMINATION">Tái khám trực tiếp</option>
                <option value="AESTHETIC">Khám dịch vụ thẩm mỹ / Chăm sóc da</option>
              </select>
            </div>

            {/* 2. Phòng khám - TUYỆT ĐỐI CHỈ CHỌN PHÒNG, KHÔNG CHỌN BÁC SĨ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Phòng khám tiếp nhận <span className="text-rose-500">*</span>
              </label>
              {isLoadingRooms ? (
                <div className="py-2 text-xs text-slate-500">Đang tải danh sách phòng...</div>
              ) : (
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-[#185adb] focus:outline-none focus:ring-2 focus:ring-[#185adb]/20 transition-all"
                  required
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Đang chờ: {r.waitingCount} người)
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                Lễ tân chỉ phân phòng khám, bác sĩ tại phòng sẽ tiếp nhận lượt khám theo hàng đợi.
              </p>
            </div>
          </div>

          {/* 3. Lý do khám */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do khám (Triệu chứng, phàn nàn chính) <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-[#185adb] focus:outline-none focus:ring-2 focus:ring-[#185adb]/20 transition-all placeholder:text-slate-400"
              placeholder="Nhập lý do bệnh nhân đến khám (VD: Mụn trứng cá viêm đỏ, ngứa da, sạm nám...)"
              required
            />
          </div>

          {/* 4. Ghi chú tiếp nhận */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú tiếp nhận (tùy chọn)
            </label>
            <Input
              value={receptionNote}
              onChange={(e) => setReceptionNote(e.target.value)}
              placeholder="VD: Bệnh nhân đến trực tiếp, người cao tuổi ưu tiên..."
            />
          </div>
        </div>

        {/* SECTION C — THÔNG TIN HÀNG ĐỢI */}
        {selectedRoomObj && (
          <div className="rounded-2xl border border-[#e2ebf5] bg-[#f8fafc] p-5 shadow-sm space-y-3">
            <h3 className="font-bold text-[#0e3a78] text-xs uppercase tracking-wider">
              Thông tin hàng đợi tại phòng khám đã chọn
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-[#cbdff2] bg-white p-3">
                <span className="text-[11px] text-slate-500">Phòng khám</span>
                <div className="font-bold text-[#0e3a78] text-sm mt-0.5">
                  {selectedRoomObj.name}
                </div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <span className="text-[11px] text-amber-700 font-medium">Bệnh nhân đang chờ</span>
                <div className="font-black text-amber-600 text-lg mt-0.5">
                  {selectedRoomObj.waitingCount} người
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <span className="text-[11px] text-emerald-800 font-medium">Số thứ tự dự kiến</span>
                <div className="font-black text-emerald-700 text-lg mt-0.5">
                  #{String(selectedRoomObj.waitingCount + 1).padStart(2, '0')}
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">
              * Số thứ tự dự kiến chỉ mang tính tham khảo. Số thứ tự chính thức được hệ thống backend cấp sau khi lưu thành công.
            </p>
          </div>
        )}

        {/* SECTION D — ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/reception/visits">
            <Button type="button" variant="secondary" disabled={isSubmitting}>
              Hủy bỏ
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || !selectedPatient || !roomId || !reason.trim()}
            className="px-6 bg-[#0e3a78] hover:bg-[#124794]"
          >
            {isSubmitting ? <LoadingSpinner /> : 'Đăng ký lượt khám & Cấp số thứ tự (STT)'}
          </Button>
        </div>
      </form>
    </div>
  );
}

