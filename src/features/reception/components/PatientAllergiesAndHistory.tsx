'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAllergiesByPatientId, createAllergy, deleteAllergy, 
  getMedicalHistoriesByPatientId, createMedicalHistory, deleteMedicalHistory 
} from '../actions';

interface Allergy {
  id: string;
  substance: string;
  reaction: string | null;
  severity: string | null;
  diagnosisDate: string | null;
}

interface MedicalHistory {
  id: string;
  type: string;
  content: string;
  diagnosisDate: string | null;
}

export default function PatientAllergiesAndHistory({ patientId }: { patientId: string }) {
  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [histories, setHistories] = useState<MedicalHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const todayStr = new Date().toISOString().split('T')[0];
  const [newAllergy, setNewAllergy] = useState({ substance: '', reaction: '', severity: 'Nhẹ', diagnosisDate: todayStr });
  const [newHistory, setNewHistory] = useState({ type: 'Nội khoa', content: '', diagnosisDate: todayStr });

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    const [allergiesRes, historiesRes] = await Promise.all([
      getAllergiesByPatientId(patientId),
      getMedicalHistoriesByPatientId(patientId)
    ]);
    if (allergiesRes.success && allergiesRes.data) setAllergies(allergiesRes.data as any[]);
    if (historiesRes.success && historiesRes.data) setHistories(historiesRes.data as any[]);
    setLoading(false);
  };

  const handleAddAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllergy.substance) return;
    if (newAllergy.diagnosisDate && newAllergy.diagnosisDate > todayStr) {
      alert("Ngày chẩn đoán không được lớn hơn ngày hiện tại");
      return;
    }
    const res = await createAllergy(patientId, newAllergy);
    if (res.success) {
      setAllergies([res.data, ...allergies]);
      setNewAllergy({ substance: '', reaction: '', severity: 'Nhẹ', diagnosisDate: todayStr });
    } else {
      alert("Lỗi khi thêm dị ứng: " + res.error);
    }
  };

  const handleRemoveAllergy = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dị ứng này?')) return;
    const res = await deleteAllergy(id, patientId);
    if (res.success) {
      setAllergies(allergies.filter(a => a.id !== id));
    }
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistory.content) return;
    if (newHistory.diagnosisDate && newHistory.diagnosisDate > todayStr) {
      alert("Ngày chẩn đoán không được lớn hơn ngày hiện tại");
      return;
    }
    const res = await createMedicalHistory(patientId, newHistory);
    if (res.success) {
      setHistories([res.data, ...histories]);
      setNewHistory({ type: 'Nội khoa', content: '', diagnosisDate: todayStr });
    }
  };

  const handleRemoveHistory = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tiền sử này?')) return;
    const res = await deleteMedicalHistory(id, patientId);
    if (res.success) {
      setHistories(histories.filter(h => h.id !== id));
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-8 p-6 bg-gray-50 rounded-2xl min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Section: Allergies */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-red-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Tiền sử dị ứng
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 bg-red-100 text-red-800 rounded-full">{allergies.length} bản ghi</span>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleAddAllergy} className="mb-6 flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chất gây dị ứng / Thuốc</label>
                <input required type="text" value={newAllergy.substance} onChange={e => setNewAllergy({...newAllergy, substance: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border outline-none" placeholder="VD: Penicillin, Hải sản..." />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Biểu hiện / Phản ứng</label>
                <input type="text" value={newAllergy.reaction} onChange={e => setNewAllergy({...newAllergy, reaction: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border outline-none" placeholder="VD: Nổi mề đay, khó thở..." />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mức độ</label>
                <select value={newAllergy.severity} onChange={e => setNewAllergy({...newAllergy, severity: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border outline-none bg-white">
                  <option value="Nhẹ">Nhẹ</option>
                  <option value="Vừa">Vừa</option>
                  <option value="Nghiêm trọng">Nghiêm trọng</option>
                </select>
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chẩn đoán</label>
                <input readOnly max={todayStr} type="date" value={newAllergy.diagnosisDate} onChange={e => setNewAllergy({...newAllergy, diagnosisDate: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border outline-none bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors h-[42px]">
                Thêm
              </button>
            </form>

            <div className="space-y-3">
              {allergies.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">Bệnh nhân chưa ghi nhận tiền sử dị ứng.</p>
              ) : (
                allergies.map(a => (
                  <div key={a.id} className="flex justify-between items-center p-4 border border-red-100 bg-red-50/30 rounded-xl hover:bg-red-50 transition-colors">
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {a.substance}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                          a.severity === 'Nghiêm trọng' ? 'bg-red-100 text-red-700' :
                          a.severity === 'Vừa' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {a.severity}
                        </span>
                      </div>
                      {a.reaction && <div className="text-sm text-gray-600 mt-1">Biểu hiện: {a.reaction}</div>}
                      {a.diagnosisDate && <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> Ngày chẩn đoán: {new Date(a.diagnosisDate).toLocaleDateString('vi-VN')}</div>}
                    </div>
                    <button onClick={() => handleRemoveAllergy(a.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section: Medical History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-blue-800 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
              Tiền sử bệnh lý
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">{histories.length} bản ghi</span>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleAddHistory} className="mb-6 flex gap-3 flex-wrap items-end">
              <div className="w-32 min-w-[120px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại tiền sử</label>
                <select value={newHistory.type} onChange={e => setNewHistory({...newHistory, type: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border outline-none bg-white">
                  <option value="Nội khoa">Nội khoa</option>
                  <option value="Ngoại khoa">Ngoại khoa</option>
                  <option value="Gia đình">Gia đình</option>
                  <option value="Lối sống">Lối sống</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chi tiết bệnh lý</label>
                <input required type="text" value={newHistory.content} onChange={e => setNewHistory({...newHistory, content: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border outline-none" placeholder="VD: Tăng huyết áp, Đái tháo đường..." />
              </div>
              <div className="w-36">
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chẩn đoán</label>
                <input readOnly max={todayStr} type="date" value={newHistory.diagnosisDate} onChange={e => setNewHistory({...newHistory, diagnosisDate: e.target.value})} className="w-full rounded-lg border-gray-300 shadow-sm p-2 border outline-none bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors h-[42px]">
                Thêm
              </button>
            </form>

            <div className="space-y-3">
              {histories.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">Bệnh nhân chưa ghi nhận bệnh lý nền.</p>
              ) : (
                histories.map(h => (
                  <div key={h.id} className="flex justify-between items-center p-4 border border-blue-50 bg-blue-50/20 rounded-xl hover:bg-blue-50/60 transition-colors">
                    <div>
                      <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mb-1">{h.type}</span>
                      <div className="text-gray-800 font-medium">{h.content}</div>
                      {h.diagnosisDate && <div className="text-xs text-gray-500 mt-1 flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg> Ngày chẩn đoán: {new Date(h.diagnosisDate).toLocaleDateString('vi-VN')}</div>}
                    </div>
                    <button onClick={() => handleRemoveHistory(h.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
