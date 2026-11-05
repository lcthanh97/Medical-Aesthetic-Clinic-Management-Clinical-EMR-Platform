'use client';

import { useState, useEffect } from 'react';
import { getAllAppointments, createVisit } from '../actions';
import { Button } from '@/components/ui';
import PatientAllergiesAndHistory from './PatientAllergiesAndHistory';

export function ReceptionPanel() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    setLoading(true);
    const res = await getAllAppointments();
    if (res.success && res.data) {
      setAppointments(res.data);
    }
    setLoading(false);
  };

  const handleCreateVisit = async () => {
    if (!selectedAppt) return;
    setCreating(true);
    const res = await createVisit(selectedAppt.patientId, selectedAppt.employeeId, selectedAppt.roomId);
    if (res.success) {
      alert('Tạo lượt khám thành công!');
      loadAppointments();
      setSelectedAppt(null);
    } else {
      alert('Lỗi: ' + res.error);
    }
    setCreating(false);
  };

  const filteredAppointments = appointments.filter(appt => {
    const nameMatch = (appt.patient?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    let dateMatch = true;
    if (searchDate) {
      const apptDate = new Date(appt.scheduledAt);
      const year = apptDate.getFullYear();
      const month = String(apptDate.getMonth() + 1).padStart(2, '0');
      const day = String(apptDate.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      dateMatch = localDateStr === searchDate;
    }
    return nameMatch && dateMatch;
  });

  return (
    <div className="flex gap-6 h-[calc(100vh-140px)]">
      {/* Left side: List of patients */}
      <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-medium text-gray-800">
              Danh sách chờ {appointments.length > 0 && <span className="text-xs text-gray-500 font-normal">({filteredAppointments.length}/{appointments.length})</span>}
            </h2>
            <Button onClick={loadAppointments} variant="outline" size="sm">Tải lại</Button>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Tên bệnh nhân..."
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-1/2 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="w-1/2 relative flex items-center">
              <input 
                type="date" 
                value={searchDate} 
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {searchDate && (
                <button
                  type="button"
                  onClick={() => setSearchDate('')}
                  className="absolute right-7 text-xs text-gray-400 hover:text-gray-600"
                  title="Xóa lọc ngày"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Đang tải...</p>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-center text-gray-500 mt-4">
              {appointments.length === 0 ? 'Không có lịch hẹn nào.' : 'Không tìm thấy lịch hẹn phù hợp.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredAppointments.map(appt => (
                <div 
                  key={appt.id} 
                  onClick={() => setSelectedAppt(appt)}
                  className={`p-3 rounded-lg cursor-pointer border transition-all ${selectedAppt?.id === appt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">{appt.patient?.fullName || 'Bệnh nhân mới'}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${appt.status === 'ARRIVED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                      {appt.status === 'ARRIVED' ? 'Đã đến' : appt.status === 'SCHEDULED' ? 'Sắp đến' : appt.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-1">
                    <strong>Giờ hẹn:</strong> {new Date(appt.scheduledAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    Bác sĩ: {appt.employee?.fullName || 'Chưa xếp'} | Phòng: {appt.room?.name || 'Chưa xếp'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Selected patient details */}
      <div className="w-2/3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto">
        {selectedAppt ? (
          <div className="p-6">
            <div className="flex justify-between items-start mb-6 pb-4 border-b">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedAppt.patient?.fullName}</h2>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>Mã BN: <strong className="text-gray-900">{selectedAppt.patient?.patientCode}</strong></span>
                  <span>SĐT: <strong className="text-gray-900">{selectedAppt.patient?.phone || 'N/A'}</strong></span>
                </div>
              </div>
              <Button 
                onClick={handleCreateVisit} 
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              >
                {creating ? 'Đang xử lý...' : 'Tạo lượt khám (Check-in)'}
              </Button>
            </div>
            
            <PatientAllergiesAndHistory patientId={selectedAppt.patientId} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="text-5xl mb-4">🩺</div>
            <p>Chọn một bệnh nhân từ danh sách để tiếp đón</p>
          </div>
        )}
      </div>
    </div>
  );
}
