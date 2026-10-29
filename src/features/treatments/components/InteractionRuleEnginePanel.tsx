'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui';
import { getAllMedicines, checkMedicineInteractions } from '../actions';

export function InteractionRuleEnginePanel({ visitId }: { visitId: string }) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    getAllMedicines().then(res => {
      if (res.success && res.data) {
        setMedicines(res.data);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setWarnings([]);
      return;
    }
    
    // Evaluate rules
    setIsChecking(true);
    checkMedicineInteractions(visitId, selectedIds).then(res => {
      setIsChecking(false);
      if (res.success && res.data) {
        setWarnings(res.data);
      }
    });
  }, [selectedIds, visitId]);

  const toggleMedicine = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          Chỉ định / Kê đơn (Kiểm tra tương tác)
        </h2>
        <p className="text-gray-500 text-sm mt-1">Chọn các loại thuốc / hoạt chất mới để đối chiếu với lịch sử điều trị và phát hiện xung khắc.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Medicine Selection */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-700">Danh sách thuốc & vật tư</h3>
            {selectedIds.length > 0 && (
              <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                Đã chọn: {selectedIds.length}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {medicines.length > 0 && (
              <label className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded border-b border-gray-200 cursor-pointer transition-colors mb-2 pb-3">
                <input 
                  type="checkbox" 
                  checked={selectedIds.length === medicines.length && medicines.length > 0}
                  ref={input => {
                    if (input) {
                      input.indeterminate = selectedIds.length > 0 && selectedIds.length < medicines.length;
                    }
                  }}
                  onChange={() => {
                    if (selectedIds.length > 0) {
                      setSelectedIds([]); // Bỏ chọn tất cả nếu đang có chọn
                    } else {
                      setSelectedIds(medicines.map(m => m.id)); // Chọn tất cả
                    }
                  }}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-gray-900 text-sm font-semibold">
                  {selectedIds.length > 0 ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </span>
              </label>
            )}
            
            {medicines.map(med => (
              <label key={med.id} className="flex items-center gap-3 p-2 hover:bg-white rounded border border-transparent hover:border-gray-200 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(med.id)}
                  onChange={() => toggleMedicine(med.id)}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-gray-800 text-sm font-medium">{med.name}</span>
              </label>
            ))}
            {medicines.length === 0 && <p className="text-gray-500 text-sm italic">Không có thuốc nào trong hệ thống.</p>}
          </div>
        </div>

        {/* Right: Rule Engine Results */}
        <div className="border border-red-100 rounded-lg p-4 bg-red-50/30">
          <h3 className="font-medium text-red-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Cảnh báo từ Rule Engine
          </h3>
          
          {isChecking ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-3"></div>
              <p className="text-red-600 text-sm">Đang đối chiếu hoạt chất...</p>
            </div>
          ) : warnings.length > 0 ? (
            <div className="space-y-3">
              {warnings.map((w, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${w.severity === 'HIGH' ? 'bg-red-100 border-red-200' : 'bg-orange-100 border-orange-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${w.severity === 'HIGH' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'}`}>
                      {w.severity === 'HIGH' ? 'Nghiêm trọng' : 'Cảnh báo'}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">Xung khắc hoạt chất</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1">
                    <strong>{w.ingredientA}</strong> ↔ <strong>{w.ingredientB}</strong>
                  </p>
                  <p className="text-sm text-red-800 mt-2">{w.message}</p>
                </div>
              ))}
            </div>
          ) : selectedIds.length > 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-emerald-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-emerald-600 font-medium text-sm">An toàn! Không phát hiện tương tác hoặc xung khắc hoạt chất nào với lịch sử điều trị.</p>
            </div>
          ) : (
            <div className="text-center py-8 opacity-50">
              <p className="text-gray-500 text-sm">Vui lòng chọn thuốc để kiểm tra tương tác.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
