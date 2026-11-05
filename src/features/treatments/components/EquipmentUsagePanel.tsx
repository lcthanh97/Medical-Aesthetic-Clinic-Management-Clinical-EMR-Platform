'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui';
import { 
  createEquipmentUsage, 
  updateEquipmentUsage, 
  deleteEquipmentUsage 
} from '@/features/inventory/actions';

export function EquipmentUsagePanel({ 
  initialUsages = [], 
  visitId, 
  equipments = [] 
}: { 
  initialUsages: any[], 
  visitId: string, 
  equipments: any[] 
}) {
  const [usages, setUsages] = useState(initialUsages);
  
  // State for forms
  const [showForm, setShowForm] = useState(false);
  const [newUsage, setNewUsage] = useState({ 
    equipmentId: '', 
    startedAt: '', 
    endedAt: '', 
    parameters: '' 
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ 
    equipmentId: '', 
    startedAt: '', 
    endedAt: '', 
    parameters: '' 
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsage.equipmentId || !newUsage.startedAt) return;
    
    let parsedParams = null;
    if (newUsage.parameters) {
      try {
        parsedParams = JSON.parse(newUsage.parameters);
      } catch (err) {
        // If not valid JSON, just store it as a simple object or string.
        // For this use case, let's store it as { details: string }
        parsedParams = { details: newUsage.parameters };
      }
    }

    const payload: any = {
      visitId,
      equipmentId: newUsage.equipmentId,
      startedAt: new Date(newUsage.startedAt),
      parameters: parsedParams
    };
    
    if (newUsage.endedAt) {
      payload.endedAt = new Date(newUsage.endedAt);
    }

    const res = await createEquipmentUsage(payload);
    
    if (res.success && res.data) {
      const equip = equipments.find(eq => eq.id === res.data!.equipmentId);
      setUsages([{ ...res.data, equipment: equip }, ...usages]);
      setNewUsage({ equipmentId: '', startedAt: '', endedAt: '', parameters: '' });
      setShowForm(false);
    } else {
      alert("Lỗi khi thêm: " + res.error);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editData.equipmentId || !editData.startedAt) return;
    
    let parsedParams = null;
    if (editData.parameters) {
      try {
        parsedParams = JSON.parse(editData.parameters);
      } catch (err) {
        parsedParams = { details: editData.parameters };
      }
    }

    const payload: any = {
      equipmentId: editData.equipmentId,
      startedAt: new Date(editData.startedAt),
      parameters: parsedParams
    };
    
    if (editData.endedAt) {
      payload.endedAt = new Date(editData.endedAt);
    } else {
      payload.endedAt = null;
    }

    const res = await updateEquipmentUsage(id, payload);
    if (res.success && res.data) {
      const equip = equipments.find(eq => eq.id === res.data!.equipmentId);
      const updated = { ...res.data, equipment: equip };
      setUsages(usages.map((u: any) => u.id === id ? updated : u));
      setEditingId(null);
    } else {
      alert("Lỗi khi cập nhật: " + res.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa bản ghi này?')) return;
    const res = await deleteEquipmentUsage(id);
    if (res.success) {
      setUsages(usages.filter((u: any) => u.id !== id));
    }
  };

  const formatParams = (params: any) => {
    if (!params) return '-';
    if (typeof params === 'object') {
      if (params.details) return params.details;
      return JSON.stringify(params);
    }
    return String(params);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Thông số thiết bị (Laser/IPL/RF...)</h2>
        <Button onClick={() => setShowForm(!showForm)} className="bg-teal-600 hover:bg-teal-700 text-white font-medium">
          {showForm ? 'Hủy' : '+ Thêm Bản Ghi'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-teal-50/50 p-5 rounded-lg border border-teal-100 mb-6 flex gap-4 items-start flex-wrap">
          <div className="w-56">
            <label className="block text-sm font-medium text-gray-700 mb-1">Thiết bị</label>
            <select required value={newUsage.equipmentId} onChange={e => setNewUsage({...newUsage, equipmentId: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border outline-none bg-white">
              <option value="">-- Chọn thiết bị --</option>
              {equipments.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name} ({eq.serial})</option>
              ))}
            </select>
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
            <input required type="datetime-local" value={newUsage.startedAt} onChange={e => setNewUsage({...newUsage, startedAt: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border outline-none" />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
            <input type="datetime-local" value={newUsage.endedAt} onChange={e => setNewUsage({...newUsage, endedAt: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border outline-none" />
          </div>
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Thông số (Năng lượng, Tần số...)</label>
            <input type="text" value={newUsage.parameters} onChange={e => setNewUsage({...newUsage, parameters: e.target.value})} className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 p-2 border outline-none" placeholder="VD: Fluence 15J/cm2, Pulse 20ms" />
          </div>
          <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-medium h-[42px] mt-6">
            Lưu
          </Button>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50/50 text-gray-500 border-b border-gray-100">
            <tr>
              <th className="py-2 px-5 font-medium">Thiết bị</th>
              <th className="py-2 px-5 font-medium w-40">Bắt đầu</th>
              <th className="py-2 px-5 font-medium w-40">Kết thúc</th>
              <th className="py-2 px-5 font-medium">Thông số thiết lập</th>
              <th className="py-2 px-5 font-medium w-28 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {usages.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400 italic bg-gray-50 rounded-lg">Chưa có thông số thiết bị nào được ghi nhận.</td>
              </tr>
            ) : (
              usages.map((u: any) => (
                <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  {editingId === u.id ? (
                    <>
                      <td className="py-2 px-3">
                        <select value={editData.equipmentId} onChange={e => setEditData({...editData, equipmentId: e.target.value})} className="w-full rounded border-gray-300 shadow-sm p-1 border text-sm bg-white">
                          <option value="">-- Chọn --</option>
                          {equipments.map(eq => (
                            <option key={eq.id} value={eq.id}>{eq.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input type="datetime-local" value={editData.startedAt} onChange={e => setEditData({...editData, startedAt: e.target.value})} className="w-full rounded border-gray-300 shadow-sm p-1 border text-sm" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="datetime-local" value={editData.endedAt} onChange={e => setEditData({...editData, endedAt: e.target.value})} className="w-full rounded border-gray-300 shadow-sm p-1 border text-sm" />
                      </td>
                      <td className="py-2 px-3">
                        <input type="text" value={editData.parameters} onChange={e => setEditData({...editData, parameters: e.target.value})} className="w-full rounded border-gray-300 shadow-sm p-1 border text-sm" />
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <button onClick={() => handleSaveEdit(u.id)} className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded mr-1">Lưu</button>
                        <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs font-medium bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Hủy</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-5 text-gray-800 font-medium">
                        {u.equipment?.name} <span className="text-gray-400 text-xs ml-1">({u.equipment?.serial})</span>
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {new Date(u.startedAt).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' })}
                      </td>
                      <td className="py-3 px-5 text-gray-600">
                        {u.endedAt ? new Date(u.endedAt).toLocaleString('vi-VN', { hour: '2-digit', minute:'2-digit', day: '2-digit', month: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3 px-5 text-gray-800 font-medium">
                        {formatParams(u.parameters)}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <button onClick={() => {
                          let startStr = '';
                          if (u.startedAt) {
                            const d = new Date(u.startedAt);
                            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                            startStr = d.toISOString().slice(0, 16);
                          }
                          let endStr = '';
                          if (u.endedAt) {
                            const d = new Date(u.endedAt);
                            d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                            endStr = d.toISOString().slice(0, 16);
                          }
                          setEditData({
                            equipmentId: u.equipmentId,
                            startedAt: startStr,
                            endedAt: endStr,
                            parameters: formatParams(u.parameters) === '-' ? '' : formatParams(u.parameters)
                          });
                          setEditingId(u.id);
                        }} className="text-blue-500 hover:text-blue-700 text-xs font-medium bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded mr-2">Sửa</button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 text-xs font-medium bg-red-50 hover:bg-red-100 px-2 py-1 rounded">Xóa</button>
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
  );
}
