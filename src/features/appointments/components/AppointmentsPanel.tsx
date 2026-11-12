'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui';
import {
  getAppointmentsMetadata,
  getAppointmentsForDate,
  createCustomerAppointment,
} from '../actions';
import {
  computeSlotsAvailability,
  CLINIC_OPERATING_SLOTS,
} from '../utils/timeSlots';
import { Clock, Calendar, CheckCircle2, Lock, Sun, Sunset, AlertCircle } from 'lucide-react';

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[date.getDay()] || '';
  return `${dayName}, ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function AppointmentsPanel({ initialData = [] }: { initialData?: any[] }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form inputs
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    roomId: '',
    employeeId: '',
  });

  // Date & Slot states
  const [minDate, setMinDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Quick date options (Hôm nay, Ngày mai, Ngày kia)
  const quickDates = useMemo(() => {
    const list: { label: string; dateStr: string }[] = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;

      let label = `${day}/${m}`;
      if (i === 0) label = 'Hôm nay';
      else if (i === 1) label = 'Ngày mai';
      else if (i === 2) label = 'Ngày kia';

      list.push({ label, dateStr });
    }
    return list;
  }, []);

  // Khởi tạo minDate và selectedDate
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    setMinDate(todayStr);

    // Nếu hôm nay đã qua 16:30 (hết ca chiều), tự động chọn ngày mai
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    let initialDate = todayStr;
    if (currentHour > 16 || (currentHour === 16 && currentMin >= 30)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tYear = tomorrow.getFullYear();
      const tMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const tDay = String(tomorrow.getDate()).padStart(2, '0');
      initialDate = `${tYear}-${tMonth}-${tDay}`;
    }

    setSelectedDate(initialDate);

    getAppointmentsMetadata().then((res) => {
      if (res.success && res.data) {
        setRooms(res.data.rooms || []);
        setEmployees(res.data.employees || []);
      }
    });
  }, []);

  // Tải danh sách lịch hẹn khi thay đổi selectedDate
  useEffect(() => {
    if (!selectedDate) return;
    setLoadingSlots(true);
    getAppointmentsForDate(selectedDate)
      .then((res) => {
        if (res.success && res.data) {
          setDayAppointments(res.data);
        } else {
          setDayAppointments([]);
        }
      })
      .finally(() => {
        setLoadingSlots(false);
      });
  }, [selectedDate]);

  // Tính toán trạng thái các khung giờ hoạt động của bệnh viện (8h sáng, 8h chiều)
  const computedSlots = useMemo(() => {
    if (!selectedDate) return [];
    return computeSlotsAvailability({
      dateStr: selectedDate,
      existingAppointments: dayAppointments,
      employeeId: formData.employeeId || undefined,
      roomId: formData.roomId || undefined,
      patientPhone: formData.phone || undefined,
    });
  }, [selectedDate, dayAppointments, formData.employeeId, formData.roomId, formData.phone]);

  // Tự động bỏ chọn nếu khung giờ đã chọn bị chuyển sang "Đã đặt" hoặc "Đã qua"
  useEffect(() => {
    if (selectedSlot) {
      const current = computedSlots.find((s) => s.time === selectedSlot);
      if (current && !current.isAvailable) {
        setSelectedSlot('');
      }
    }
  }, [computedSlots, selectedSlot]);

  // Phân chia ca sáng và ca chiều
  const morningSlots = useMemo(
    () => computedSlots.filter((s) => s.period === 'morning'),
    [computedSlots]
  );
  const afternoonSlots = useMemo(
    () => computedSlots.filter((s) => s.period === 'afternoon'),
    [computedSlots]
  );

  const availableMorningCount = useMemo(
    () => morningSlots.filter((s) => s.isAvailable).length,
    [morningSlots]
  );
  const availableAfternoonCount = useMemo(
    () => afternoonSlots.filter((s) => s.isAvailable).length,
    [afternoonSlots]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.fullName || !formData.phone) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ tên và Số điện thoại.');
      return;
    }

    if (!selectedDate) {
      setErrorMessage('Vui lòng chọn ngày khám.');
      return;
    }

    if (!selectedSlot) {
      setErrorMessage('Vui lòng chọn một khung giờ khám còn trống trong danh sách.');
      return;
    }

    const chosenSlot = computedSlots.find((s) => s.time === selectedSlot);
    if (!chosenSlot || !chosenSlot.isAvailable) {
      setErrorMessage(
        chosenSlot?.reason || 'Khung giờ này đã được đặt hoặc không còn khả dụng. Vui lòng chọn khung giờ khác.'
      );
      return;
    }

    // Ghép ngày và giờ được chọn thành chuỗi thời gian hợp lệ
    const scheduledAtIso = new Date(`${selectedDate}T${selectedSlot}:00`).toISOString();

    setIsLoading(true);
    const payload = {
      fullName: formData.fullName,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth || undefined,
      roomId: formData.roomId || undefined,
      employeeId: formData.employeeId || undefined,
      scheduledAt: scheduledAtIso,
    };

    const res = await createCustomerAppointment(payload);
    setIsLoading(false);

    if (res.success) {
      setIsSuccess(true);
      setFormData({
        fullName: '',
        phone: '',
        dateOfBirth: '',
        roomId: '',
        employeeId: '',
      });
      setSelectedSlot('');
      // Cập nhật lại lịch hẹn cho ngày hiện tại
      if (selectedDate) {
        getAppointmentsForDate(selectedDate).then((r) => {
          if (r.success && r.data) setDayAppointments(r.data);
        });
      }
      setErrorMessage(null);
    } else {
      setErrorMessage(res.error || 'Có lỗi xảy ra khi đặt lịch.');
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center max-w-lg mx-auto mt-10">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Đặt lịch thành công!</h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Cảm ơn bạn đã đặt lịch khám. Hệ thống đã ghi nhận lịch của bạn và sẽ liên hệ xác nhận trong thời gian sớm nhất.
        </p>
        <Button
          onClick={() => setIsSuccess(false)}
          className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
        >
          Đặt thêm lịch khác
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-4 mb-10">
      <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 relative overflow-hidden">
        {/* Trang trí nền */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-50 opacity-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-50 opacity-50 blur-3xl pointer-events-none"></div>

        <div className="mb-8 text-center relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Đặt Lịch Hẹn Khám</h2>
          <p className="text-gray-500 text-sm sm:text-base">
            Chọn ngày và khung giờ hoạt động của bệnh viện (Sáng: 07:00 - 11:00, Chiều: 13:00 - 17:00)
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3 shadow-sm relative z-10">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm font-medium">{errorMessage}</div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-red-600 text-sm font-bold"
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Bước 1: Thông tin cá nhân */}
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-5">
            <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm font-bold">1</span>
              Thông tin cá nhân
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Nguyễn Văn A"
                  suppressHydrationWarning
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="tel"
                  placeholder="090..."
                  suppressHydrationWarning
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày sinh</label>
              <input
                type="date"
                suppressHydrationWarning
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Bước 2: Dịch vụ & Bác sĩ */}
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-5">
            <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm font-bold">2</span>
              Dịch vụ & Bác sĩ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng khám / Dịch vụ</label>
                <select
                  suppressHydrationWarning
                  value={formData.roomId}
                  onChange={(e) => {
                    setFormData({ ...formData, roomId: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                >
                  <option value="">-- Chọn dịch vụ / phòng (Tùy chọn) --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bác sĩ / Kỹ thuật viên</label>
                <select
                  suppressHydrationWarning
                  value={formData.employeeId}
                  onChange={(e) => {
                    setFormData({ ...formData, employeeId: e.target.value });
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
                >
                  <option value="">-- Chọn bác sĩ (Tùy chọn) --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bước 3: Chọn Ngày & Khung giờ hoạt động bệnh viện */}
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-6">
            <h3 className="font-semibold text-gray-800 text-lg mb-2 flex items-center justify-between">
              <span className="flex items-center">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm font-bold">3</span>
                Chọn Ngày & Khung giờ khám
              </span>
              <span className="text-xs font-normal text-slate-500 flex items-center gap-1">
                <Clock size={14} className="text-blue-500" />
                Mỗi ca khám 30 phút
              </span>
            </h3>

            {/* Chọn Ngày khám */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar size={16} className="text-blue-600" />
                  Ngày khám <span className="text-red-500">*</span>
                </label>
                {/* Quick Date buttons */}
                <div className="flex items-center gap-1.5">
                  {quickDates.map((q) => (
                    <button
                      key={q.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDate(q.dateStr);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        selectedDate === q.dateStr
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              <input
                required
                type="date"
                suppressHydrationWarning
                min={minDate || undefined}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm font-medium text-gray-800"
              />
              {selectedDate && (
                <div className="mt-1.5 text-xs text-blue-600 font-medium">
                  📅 Đang xem lịch ngày: <strong>{formatDisplayDate(selectedDate)}</strong>
                </div>
              )}
            </div>

            {/* Khung giờ hoạt động bệnh viện */}
            <div className="space-y-6 pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <span>Khung giờ khám của Bệnh viện</span>
                  {loadingSlots && (
                    <span className="text-xs text-blue-500 font-normal animate-pulse">
                      (Đang cập nhật trạng thái...)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Chỉ được phép đặt các khung giờ <span className="text-emerald-600 font-semibold">Còn trống</span>
                </div>
              </div>

              {/* Buổi sáng: 07h00 - 11h00 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Sun size={14} className="text-amber-500" />
                    <span>Buổi sáng: 07:00 - 11:00</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Còn trống <strong className="text-emerald-600">{availableMorningCount}</strong>/8 khung giờ
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => {
                          setSelectedSlot(slot.time);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        className={`relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/50 shadow-md transform -translate-y-0.5'
                            : slot.isAvailable
                            ? 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer shadow-sm hover:shadow'
                            : slot.isBooked
                            ? 'bg-red-50/60 text-gray-400 border-red-200 cursor-not-allowed'
                            : 'bg-gray-100/70 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isSelected
                                ? 'text-white'
                                : slot.isAvailable
                                ? 'text-gray-900'
                                : 'text-gray-500 line-through'
                            }`}
                          >
                            {slot.timeRange}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center text-[10px] font-black">
                              ✓
                            </span>
                          )}
                          {!slot.isAvailable && slot.isBooked && (
                            <Lock size={12} className="text-red-400" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          {slot.isBooked ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Đã đặt
                            </span>
                          ) : slot.isPast ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-500">
                              Đã qua giờ
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">
                              Đang chọn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Còn trống
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Buổi chiều: 13h00 - 17h00 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    <Sunset size={14} className="text-indigo-500" />
                    <span>Buổi chiều: 13:00 - 17:00</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    Còn trống <strong className="text-emerald-600">{availableAfternoonCount}</strong>/8 khung giờ
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => {
                          setSelectedSlot(slot.time);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        className={`relative p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400/50 shadow-md transform -translate-y-0.5'
                            : slot.isAvailable
                            ? 'bg-white text-gray-800 border-gray-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer shadow-sm hover:shadow'
                            : slot.isBooked
                            ? 'bg-red-50/60 text-gray-400 border-red-200 cursor-not-allowed'
                            : 'bg-gray-100/70 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span
                            className={`text-xs sm:text-sm font-bold ${
                              isSelected
                                ? 'text-white'
                                : slot.isAvailable
                                ? 'text-gray-900'
                                : 'text-gray-500 line-through'
                            }`}
                          >
                            {slot.timeRange}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center text-[10px] font-black">
                              ✓
                            </span>
                          )}
                          {!slot.isAvailable && slot.isBooked && (
                            <Lock size={12} className="text-red-400" />
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          {slot.isBooked ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              Đã đặt
                            </span>
                          ) : slot.isPast ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-200 text-gray-500">
                              Đã qua giờ
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">
                              Đang chọn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Còn trống
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chú thích trạng thái (Legend) */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs text-gray-500 border-t border-gray-100">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <strong>Còn trống:</strong> Có thể chọn đặt
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <strong>Đã đặt:</strong> Không thể đặt
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400"></span>
                  <strong>Đã qua giờ:</strong> Đã quá hạn
                </span>
              </div>

              {/* Khung xác nhận khung giờ đã chọn */}
              {selectedSlot ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-start gap-3 shadow-sm">
                  <CheckCircle2 size={22} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm">
                    <div className="font-bold text-emerald-950 text-base">
                      Khung giờ đã chọn: {computedSlots.find((s) => s.time === selectedSlot)?.timeRange} (
                      {computedSlots.find((s) => s.time === selectedSlot)?.period === 'morning'
                        ? 'Buổi sáng'
                        : 'Buổi chiều'}
                      )
                    </div>
                    <div className="text-xs text-emerald-800 mt-1">
                      📅 Ngày: <strong>{formatDisplayDate(selectedDate)}</strong>
                      {' • '}
                      {formData.employeeId
                        ? `Bác sĩ: ${employees.find((e) => e.id === formData.employeeId)?.fullName || 'Đang cập nhật'}`
                        : 'Bác sĩ: Phòng khám sẽ sắp xếp bác sĩ phù hợp'}
                      {' • '}
                      {formData.roomId
                        ? `Phòng: ${rooms.find((r) => r.id === formData.roomId)?.name || 'Đang cập nhật'}`
                        : 'Phòng: Phân bổ tại quầy'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSlot('')}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Đổi giờ
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                  <span>👉</span>
                  <span>Vui lòng nhấp vào một khung giờ <strong>Còn trống</strong> ở trên để hoàn tất việc chọn lịch khám.</span>
                </div>
              )}
            </div>
          </div>

          {/* Nút gửi */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading || !selectedSlot}
              suppressHydrationWarning
              className={`w-full font-medium py-4 rounded-xl shadow-lg transition-all flex items-center justify-center text-lg ${
                !selectedSlot
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Đang xử lý...
                </span>
              ) : selectedSlot ? (
                `Xác Nhận Đặt Lịch (${selectedSlot} - ${computedSlots.find((s) => s.time === selectedSlot)?.endTime || ''})`
              ) : (
                'Vui lòng chọn khung giờ trống để đặt lịch'
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
