'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { getAppointmentsMetadata, createCustomerAppointment } from '../actions';

export function AppointmentsPanel({ initialData = [] }: { initialData?: any[] }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    roomId: '',
    employeeId: '',
    scheduledAt: ''
  });

  const [minDateTime, setMinDateTime] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMinDateTime(now.toISOString().slice(0, 16));

    getAppointmentsMetadata().then(res => {
      if (res.success && res.data) {
        setRooms(res.data.rooms || []);
        setEmployees(res.data.employees || []);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.scheduledAt) {
      setErrorMessage('Vui lòng chọn thời gian hẹn.');
      return;
    }

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const currentMin = now.toISOString().slice(0, 16);

    if (formData.scheduledAt < currentMin) {
      setErrorMessage('Thời gian hẹn không được nhỏ hơn thời gian hiện tại.');
      return;
    }

    if (!formData.fullName || !formData.phone) {
      setErrorMessage('Vui lòng nhập đầy đủ Họ tên và Số điện thoại.');
      return;
    }
    
    setIsLoading(true);
    const payload = {
      fullName: formData.fullName,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth || undefined,
      roomId: formData.roomId || undefined,
      employeeId: formData.employeeId || undefined,
      scheduledAt: new Date(formData.scheduledAt).toISOString(),
      status: 'SCHEDULED'
    };

    const res = await createCustomerAppointment(payload);
    setIsLoading(false);
    
    if (res.success) {
      setIsSuccess(true);
      setFormData({
        fullName: '', phone: '', dateOfBirth: '', roomId: '', employeeId: '', scheduledAt: ''
      });
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
        <p className="text-gray-600 mb-8 leading-relaxed">Cảm ơn bạn đã đặt lịch. Chúng tôi sẽ liên hệ lại qua số điện thoại của bạn để xác nhận trong thời gian sớm nhất.</p>
        <Button onClick={() => setIsSuccess(false)} className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg">
          Đặt thêm lịch khác
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mt-4 mb-10">
      <section className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-10 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-50 opacity-50 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-blue-50 opacity-50 blur-3xl pointer-events-none"></div>

        <div className="mb-8 text-center relative z-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Đặt Lịch Hẹn Khám</h2>
          <p className="text-gray-500 text-sm sm:text-base">Vui lòng điền đầy đủ thông tin bên dưới để đặt lịch với bác sĩ.</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-3 shadow-sm relative z-10">
            <span className="text-xl leading-none">⚠️</span>
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
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-5">
            <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">1</span>
              Thông tin cá nhân
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Họ và tên <span className="text-red-500">*</span></label>
                <input required type="text" placeholder="Nguyễn Văn A" suppressHydrationWarning value={formData.fullName} onChange={e=>{setFormData({...formData, fullName: e.target.value}); if (errorMessage) setErrorMessage(null);}} className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Số điện thoại <span className="text-red-500">*</span></label>
                <input required type="tel" placeholder="090..." suppressHydrationWarning value={formData.phone} onChange={e=>{setFormData({...formData, phone: e.target.value}); if (errorMessage) setErrorMessage(null);}} className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngày sinh</label>
              <input type="date" suppressHydrationWarning value={formData.dateOfBirth} onChange={e=>setFormData({...formData, dateOfBirth: e.target.value})} className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
            </div>
          </div>
          
          <div className="bg-gray-50/50 p-6 rounded-xl border border-gray-100 space-y-5">
            <h3 className="font-semibold text-gray-800 text-lg mb-4 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">2</span>
              Thông tin dịch vụ & Thời gian
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phòng khám / Dịch vụ</label>
                <select suppressHydrationWarning value={formData.roomId} onChange={e=>{setFormData({...formData, roomId: e.target.value}); if (errorMessage) setErrorMessage(null);}} className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm">
                  <option value="">-- Chọn dịch vụ / phòng --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bác sĩ / Kỹ thuật viên</label>
                <select suppressHydrationWarning value={formData.employeeId} onChange={e=>{setFormData({...formData, employeeId: e.target.value}); if (errorMessage) setErrorMessage(null);}} className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm">
                  <option value="">-- Chọn bác sĩ (Tùy chọn) --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Thời gian hẹn <span className="text-red-500">*</span></label>
              <input required type="datetime-local" suppressHydrationWarning min={minDateTime || undefined} value={formData.scheduledAt} onChange={e=>{setFormData({...formData, scheduledAt: e.target.value}); if (errorMessage) setErrorMessage(null);}} className="w-full bg-white border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50/80 border border-blue-100 rounded-xl text-blue-700 text-xs leading-relaxed">
              <span className="text-sm">ℹ️</span>
              <span><strong>Quy định đặt lịch:</strong> Các lịch hẹn phải cách nhau tối thiểu 30 phút theo từng Bác sĩ, Phòng khám hoặc Bệnh nhân để đảm bảo chất lượng phục vụ.</span>
            </div>
          </div>
          
          <div className="pt-4">
            <Button type="submit" disabled={isLoading} suppressHydrationWarning className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </span>
              ) : (
                'Xác Nhận Đặt Lịch'
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
