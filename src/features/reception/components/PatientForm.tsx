'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, LoadingSpinner } from '@/components/ui';
import { receptionApi } from '../api/receptionApi';
import type {
  CreatePatientDto,
  UpdatePatientDto,
  PatientDetail,
  AllergyItem,
  MedicalHistoryItem,
  DuplicateCheckResult,
} from '../types/reception.types';

interface PatientFormProps {
  initialData?: PatientDetail;
  isEdit?: boolean;
}

const COMMON_HISTORY_TYPES = [
  'Tiền sử bệnh lý bản thân',
  'Tiền sử gia đình',
  'Tiền sử phẫu thuật / Thủ thuật thẩm mỹ',
  'Đang sử dụng thuốc / Thực phẩm chức năng',
  'Chăm sóc da & Mỹ phẩm dị ứng',
  'Khác',
];

const SEVERITY_LEVELS = [
  { value: 'Nhẹ', label: 'Nhẹ (Ngứa nhẹ, mẩn đỏ thoáng qua)' },
  { value: 'Trung bình', label: 'Trung bình (Phát ban diện rộng, sưng phù)' },
  { value: 'Nặng', label: 'Nặng / Nguy hiểm (Khó thở, sốc phản vệ)' },
];

export function PatientForm({ initialData, isEdit = false }: PatientFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(initialData?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialData?.dateOfBirth ? initialData.dateOfBirth.split('T')[0] : ''
  );
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [allergies, setAllergies] = useState<AllergyItem[]>(
    initialData?.allergies && initialData.allergies.length > 0
      ? initialData.allergies
      : []
  );
  const [histories, setHistories] = useState<MedicalHistoryItem[]>(
    initialData?.histories && initialData.histories.length > 0
      ? initialData.histories
      : []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);

  // Debounced duplicate check (only in create mode)
  useEffect(() => {
    if (isEdit) return;
    if (!phone && (!fullName || !dateOfBirth)) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const res = await receptionApi.checkDuplicate({
          phone: phone.trim() || undefined,
          fullName: fullName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
        });
        if (res.success && res.data && res.data.isDuplicate) {
          setDuplicateWarning(res.data);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // Silently continue
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [phone, fullName, dateOfBirth, isEdit]);

  // Allergy handlers
  const handleAddAllergy = () => {
    setAllergies([...allergies, { substance: '', reaction: '', severity: 'Nhẹ' }]);
  };

  const handleUpdateAllergy = (index: number, field: keyof AllergyItem, value: string) => {
    const updated = [...allergies];
    updated[index] = { ...updated[index], [field]: value };
    setAllergies(updated);
  };

  const handleRemoveAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  // History handlers
  const handleAddHistory = () => {
    setHistories([...histories, { type: 'Tiền sử bệnh lý bản thân', content: '' }]);
  };

  const handleUpdateHistory = (index: number, field: keyof MedicalHistoryItem, value: string) => {
    const updated = [...histories];
    updated[index] = { ...updated[index], [field]: value };
    setHistories(updated);
  };

  const handleRemoveHistory = (index: number) => {
    setHistories(histories.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Vui lòng nhập họ và tên bệnh nhân');
      return;
    }

    // Clean allergy records with substance
    const cleanAllergies = allergies.filter((a) => a.substance.trim().length > 0);
    // Clean history records with content
    const cleanHistories = histories.filter((h) => h.content.trim().length > 0);

    setIsSubmitting(true);
    try {
      if (isEdit && initialData) {
        const payload: UpdatePatientDto = {
          fullName: fullName.trim(),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
          phone: phone.trim() || null,
          allergies: cleanAllergies,
          histories: cleanHistories,
        };

        const res = await receptionApi.updatePatient(initialData.id, payload);
        if (res.success && res.data) {
          router.push(`/reception/${initialData.id}`);
        } else {
          setFormError(res.message || 'Không thể cập nhật hồ sơ');
        }
      } else {
        const payload: CreatePatientDto = {
          fullName: fullName.trim(),
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
          phone: phone.trim() || null,
          allergies: cleanAllergies,
          histories: cleanHistories,
        };

        const res = await receptionApi.createPatient(payload);
        if (res.success && res.data) {
          router.push(`/reception/${res.data.id}`);
        } else {
          setFormError(res.message || 'Không thể tạo hồ sơ bệnh nhân');
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <span>{formError}</span>
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && duplicateWarning.isDuplicate && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 shadow-sm">
          <div className="flex items-center gap-2 font-bold mb-2 text-amber-900">
            <span>CẢNH BÁO: Phát hiện hồ sơ bệnh nhân có khả năng trùng lặp</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs mb-3">
            {duplicateWarning.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <div className="text-xs text-amber-700 font-medium">
            Các hồ sơ nghi trùng:
            <div className="mt-1 flex flex-wrap gap-2">
              {duplicateWarning.matches.map((m) => (
                <span
                  key={m.id}
                  className="rounded-lg bg-white/80 px-2.5 py-1 border border-amber-200 font-semibold"
                >
                  {m.fullName} ({m.patientCode}) - {m.phone || 'Không có SĐT'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: Personal & Contact Information */}
      <section className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5 border-b border-[#e2ebf5] pb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f1fc] text-[#0e3a78] font-bold text-sm">
            1
          </span>
          <h2 className="text-base font-bold text-[#0e3a78]">
            Thông tin cơ bản bệnh nhân
          </h2>
        </div>

        {isEdit && initialData && (
          <div className="mb-4 p-3 bg-[#f8fafc] border border-[#e2ebf5] rounded-xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Mã hồ sơ bệnh nhân (Bất biến):</span>
            <span className="font-bold text-[#0e3a78] font-mono text-sm">{initialData.patientCode}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Họ và tên bệnh nhân <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Thị Lan Anh"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ngày tháng năm sinh
            </label>
            <Input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số điện thoại liên hệ
              {isCheckingDuplicate && (
                <span className="ml-2 text-[10px] text-slate-400 font-normal">Đang kiểm tra...</span>
              )}
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ví dụ: 0912345678"
            />
          </div>
        </div>
      </section>

      {/* SECTION 2: Allergies */}
      <section className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-[#e2ebf5] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fee2e2] text-[#dc2626] font-bold text-sm">
              2
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0e3a78]">
                Cảnh báo Dị ứng (Allergy)
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận các chất dị ứng thuốc, mỹ phẩm hoặc thực phẩm để bác sĩ lưu ý khi điều trị.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddAllergy}
          >
            + Thêm dị ứng
          </Button>
        </div>

        {allergies.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-[#e2ebf5] rounded-xl">
            Bệnh nhân chưa ghi nhận dị ứng nào. Bấm "+ Thêm dị ứng" nếu cần lưu ý lâm sàng.
          </div>
        ) : (
          <div className="space-y-3">
            {allergies.map((allergy, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2ebf5]"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Dị nguyên / Tác nhân gây dị ứng <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    value={allergy.substance}
                    onChange={(e) => handleUpdateAllergy(index, 'substance', e.target.value)}
                    placeholder="Ví dụ: Penicillin, Paracetamol, Retinol, Hải sản..."
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Biểu hiện / Phản ứng
                  </label>
                  <Input
                    type="text"
                    value={allergy.reaction || ''}
                    onChange={(e) => handleUpdateAllergy(index, 'reaction', e.target.value)}
                    placeholder="Ví dụ: Nổi mề đay, mẩn ngứa, sưng môi..."
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Mức độ nghiêm trọng
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#185adb]/20"
                    value={allergy.severity || 'Nhẹ'}
                    onChange={(e) => handleUpdateAllergy(index, 'severity', e.target.value)}
                  >
                    {SEVERITY_LEVELS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1 flex justify-end sm:pt-4">
                  <button
                    type="button"
                    onClick={() => handleRemoveAllergy(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold p-1 cursor-pointer"
                    title="Xóa dòng dị ứng này"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Medical History */}
      <section className="rounded-2xl border border-[#e2ebf5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5 border-b border-[#e2ebf5] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f1fc] text-[#0e3a78] font-bold text-sm">
              3
            </span>
            <div>
              <h2 className="text-base font-bold text-[#0e3a78]">
                Tiền sử y tế (Medical History)
              </h2>
              <p className="text-xs text-slate-500">
                Ghi nhận tiền sử bệnh nội khoa, ngoại khoa, điều trị da liễu hoặc tiền sử bệnh gia đình.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddHistory}
          >
            + Thêm tiền sử
          </Button>
        </div>

        {histories.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-[#e2ebf5] rounded-xl">
            Chưa có ghi nhận tiền sử y khoa. Bấm "+ Thêm tiền sử" để bổ sung chi tiết.
          </div>
        ) : (
          <div className="space-y-3">
            {histories.map((history, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start p-3.5 bg-[#f8fafc] rounded-xl border border-[#e2ebf5]"
              >
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Phân loại tiền sử
                  </label>
                  <select
                    className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#185adb]/20"
                    value={history.type}
                    onChange={(e) => handleUpdateHistory(index, 'type', e.target.value)}
                  >
                    {COMMON_HISTORY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-7">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nội dung chi tiết <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={history.content}
                    onChange={(e) => handleUpdateHistory(index, 'content', e.target.value)}
                    placeholder="Mô tả chi tiết: tình trạng bệnh, thời gian mắc, phương pháp từng điều trị..."
                    className="w-full rounded-xl border border-[#e2ebf5] bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#185adb]/20"
                  />
                </div>

                <div className="sm:col-span-1 flex justify-end sm:pt-6">
                  <button
                    type="button"
                    onClick={() => handleRemoveHistory(index)}
                    className="text-red-500 hover:text-red-700 text-sm font-semibold p-1 cursor-pointer"
                    title="Xóa tiền sử này"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2ebf5]">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Hủy bỏ
        </Button>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Đang lưu hồ sơ...
            </span>
          ) : isEdit ? (
            'Cập nhật hồ sơ bệnh nhân'
          ) : (
            'Lưu hồ sơ bệnh nhân'
          )}
        </Button>
      </div>
    </form>
  );
}

