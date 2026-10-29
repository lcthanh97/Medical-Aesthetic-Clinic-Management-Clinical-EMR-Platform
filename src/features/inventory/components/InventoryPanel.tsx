'use client';

import React, { useState } from 'react';
import { 
  createMedicine, 
  updateMedicine, 
  deleteMedicine, 
  createSupply, 
  updateSupply, 
  deleteSupply,
  getInventoryTransactions
} from '../actions';
import { 
  Package, 
  Pill, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  Loader2, 
  History, 
  ArrowDownRight, 
  ArrowUpRight, 
  RefreshCw, 
  FileText,
  UserCheck
} from 'lucide-react';

export function InventoryPanel({ 
  medicines: initialMedicines = [], 
  supplies: initialSupplies = [], 
  equipments = [],
  transactions: initialTransactions = []
}: { 
  medicines: any[], 
  supplies: any[], 
  equipments: any[],
  transactions?: any[]
}) {
  const [activeTab, setActiveTab] = useState<'medicines' | 'supplies' | 'transactions'>('medicines');
  const [medicines, setMedicines] = useState(initialMedicines);
  const [supplies, setSupplies] = useState(initialSupplies);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isRefreshingTx, setIsRefreshingTx] = useState(false);
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'TREATMENT_USAGE' | 'IMPORT' | 'EXPORT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // State cho Thêm mới (Form ở trên)
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '', unit: '', stock: 0, unitCost: 0, minStock: 0, status: 'ACTIVE'
  });
  const [isAdding, setIsAdding] = useState(false);

  // State cho Sửa trực tiếp tại hàng (Inline Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '', unit: '', stock: 0, unitCost: 0, minStock: 0, status: 'ACTIVE'
  });
  const [isSaving, setIsSaving] = useState(false);

  // Bắt đầu sửa ngay tại hàng
  const handleStartEdit = (item: any) => {
    setShowAddForm(false);
    setEditingId(item.id);
    setEditFormData({
      name: item.name || '',
      unit: item.unit || '',
      stock: Number(item.stock) || 0,
      unitCost: Number(item.unitCost) || 0,
      minStock: Number(item.minStock) || 0,
      status: item.status || 'ACTIVE'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Lưu chỉnh sửa ngay tại hàng
  const handleSaveInline = async (id: string, type: 'medicines' | 'supplies') => {
    if (!editFormData.name.trim()) {
      alert('Vui lòng nhập tên!');
      return;
    }
    setIsSaving(true);
    const payload = {
      ...editFormData,
      stock: Number(editFormData.stock),
      unitCost: Number(editFormData.unitCost),
      minStock: Number(editFormData.minStock),
    };

    if (type === 'medicines') {
      const res = await updateMedicine(id, payload);
      if (res.success && res.data) {
        setMedicines(prev => prev.map(m => m.id === id ? res.data : m));
        setEditingId(null);
      } else {
        alert('Lỗi cập nhật: ' + (res.error || 'Có lỗi xảy ra'));
      }
    } else {
      const res = await updateSupply(id, payload);
      if (res.success && res.data) {
        setSupplies(prev => prev.map(s => s.id === id ? res.data : s));
        setEditingId(null);
      } else {
        alert('Lỗi cập nhật: ' + (res.error || 'Có lỗi xảy ra'));
      }
    }
    setIsSaving(false);
  };

  // Xóa mục
  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
    if (activeTab === 'medicines') {
      const res = await deleteMedicine(id);
      if (res.success) {
        setMedicines(prev => prev.filter(m => m.id !== id));
        if (editingId === id) setEditingId(null);
      }
    } else if (activeTab === 'supplies') {
      const res = await deleteSupply(id);
      if (res.success) {
        setSupplies(prev => prev.filter(s => s.id !== id));
        if (editingId === id) setEditingId(null);
      }
    }
  };

  // Submit form Thêm mới
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    const payload = {
      ...addFormData,
      stock: Number(addFormData.stock),
      unitCost: Number(addFormData.unitCost),
      minStock: Number(addFormData.minStock),
    };

    if (activeTab === 'medicines') {
      const res = await createMedicine(payload);
      if (res.success && res.data) {
        setMedicines(prev => [res.data, ...prev]);
        setShowAddForm(false);
        setAddFormData({ name: '', unit: '', stock: 0, unitCost: 0, minStock: 0, status: 'ACTIVE' });
      } else {
        alert('Lỗi thêm thuốc: ' + (res.error || 'Có lỗi xảy ra'));
      }
    } else if (activeTab === 'supplies') {
      const res = await createSupply(payload);
      if (res.success && res.data) {
        setSupplies(prev => [res.data, ...prev]);
        setShowAddForm(false);
        setAddFormData({ name: '', unit: '', stock: 0, unitCost: 0, minStock: 0, status: 'ACTIVE' });
      } else {
        alert('Lỗi thêm vật tư: ' + (res.error || 'Có lỗi xảy ra'));
      }
    }
    setIsAdding(false);
  };

  // Làm mới lịch sử giao dịch kho
  const handleRefreshTransactions = async () => {
    setIsRefreshingTx(true);
    const res = await getInventoryTransactions(100);
    if (res.success && res.data) {
      setTransactions(res.data);
    }
    setIsRefreshingTx(false);
  };

  // Lọc dữ liệu theo từ khóa tìm kiếm
  const filteredMedicines = medicines.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.unit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSupplies = supplies.filter(s => 
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.unit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTransactions = transactions.filter(tx => {
    const itemName = (tx.medicine?.name || tx.supply?.name || '').toLowerCase();
    const notes = (tx.notes || '').toLowerCase();
    const creator = (tx.createdBy?.fullName || tx.createdById || '').toLowerCase();
    const refId = (tx.referenceId || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = itemName.includes(term) || notes.includes(term) || creator.includes(term) || refId.includes(term);
    const matchesFilter = txTypeFilter === 'ALL' || 
      (txTypeFilter === 'TREATMENT_USAGE' 
        ? (tx.transactionType === 'TREATMENT_USAGE' || tx.transactionType === 'TREATMENT_USE')
        : tx.transactionType === txTypeFilter);

    return matchesSearch && matchesFilter;
  });

  const renderTable = (data: any[], type: 'medicines' | 'supplies') => (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="py-3 px-4">Tên {type === 'medicines' ? 'thuốc' : 'vật tư'}</th>
            <th className="py-3 px-4">Đơn vị</th>
            <th className="py-3 px-4 text-right">Đơn giá (VNĐ)</th>
            <th className="py-3 px-4 text-center">Tồn kho</th>
            <th className="py-3 px-4 text-center">Tối thiểu</th>
            <th className="py-3 px-4 text-center">Trạng thái</th>
            <th className="py-3 px-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-10 text-center text-gray-400">
                {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Không có dữ liệu'}
              </td>
            </tr>
          ) : data.map(item => {
            const isEditing = editingId === item.id;
            const isLowStock = Number(item.stock) <= Number(item.minStock);

            if (isEditing) {
              return (
                <tr key={item.id} className="bg-blue-50/80 border-y-2 border-blue-400 transition-colors">
                  {/* Tên */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      {type === 'medicines' ? <Pill size={16} className="text-blue-600 shrink-0" /> : <Package size={16} className="text-teal-600 shrink-0" />}
                      <input 
                        type="text" 
                        required
                        value={editFormData.name} 
                        onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSaveInline(item.id, type);
                          else if (e.key === 'Escape') handleCancelEdit();
                        }}
                        placeholder="Tên..."
                        autoFocus
                        className="w-full min-w-[200px] px-2.5 py-1.5 border border-blue-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800 shadow-sm"
                      />
                    </div>
                  </td>

                  {/* Đơn vị */}
                  <td className="py-2.5 px-3">
                    <input 
                      type="text" 
                      required
                      value={editFormData.unit} 
                      onChange={e => setEditFormData({...editFormData, unit: e.target.value})}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveInline(item.id, type);
                        else if (e.key === 'Escape') handleCancelEdit();
                      }}
                      placeholder="hộp, viên..."
                      className="w-20 px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white text-center focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </td>

                  {/* Đơn giá */}
                  <td className="py-2.5 px-3 text-right">
                    <input 
                      type="number" 
                      min="0"
                      value={editFormData.unitCost} 
                      onChange={e => setEditFormData({...editFormData, unitCost: Number(e.target.value)})}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveInline(item.id, type);
                        else if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="w-28 px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white text-right focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </td>

                  {/* Tồn kho */}
                  <td className="py-2.5 px-3 text-center">
                    <input 
                      type="number" 
                      min="0"
                      value={editFormData.stock} 
                      onChange={e => setEditFormData({...editFormData, stock: Number(e.target.value)})}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveInline(item.id, type);
                        else if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="w-20 px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white text-center font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </td>

                  {/* Tối thiểu */}
                  <td className="py-2.5 px-3 text-center">
                    <input 
                      type="number" 
                      min="0"
                      value={editFormData.minStock} 
                      onChange={e => setEditFormData({...editFormData, minStock: Number(e.target.value)})}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveInline(item.id, type);
                        else if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="w-20 px-2 py-1.5 border border-blue-300 rounded-lg text-sm bg-white text-center focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                  </td>

                  {/* Trạng thái */}
                  <td className="py-2.5 px-3 text-center">
                    <select 
                      value={editFormData.status} 
                      onChange={e => setEditFormData({...editFormData, status: e.target.value})}
                      className="px-2 py-1.5 border border-blue-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 shadow-sm"
                    >
                      <option value="ACTIVE">Đang dùng</option>
                      <option value="INACTIVE">Ngưng dùng</option>
                    </select>
                  </td>

                  {/* Nút thao tác Lưu & Hủy */}
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button 
                        type="button" 
                        onClick={() => handleSaveInline(item.id, type)} 
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        title="Lưu thay đổi (Enter)"
                      >
                        {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Lưu
                      </button>
                      <button 
                        type="button" 
                        onClick={handleCancelEdit} 
                        disabled={isSaving}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                        title="Hủy (Esc)"
                      >
                        <X size={13} /> Hủy
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                <td className="py-3 px-4 font-semibold text-gray-800">
                  <div className="flex items-center gap-2">
                    {type === 'medicines' ? <Pill size={16} className="text-blue-500" /> : <Package size={16} className="text-teal-500" />}
                    {item.name}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600">{item.unit}</td>
                <td className="py-3 px-4 text-right text-gray-600">{Number(item.unitCost).toLocaleString('vi-VN')}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-md font-bold ${isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {item.stock}
                  </span>
                </td>
                <td className="py-3 px-4 text-center text-gray-500">{item.minStock}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {item.status === 'ACTIVE' ? 'Đang dùng' : 'Ngưng dùng'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2">
                  <button 
                    type="button" 
                    onClick={() => handleStartEdit(item)} 
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                    title="Chỉnh sửa trực tiếp"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleDelete(item.id)} 
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderTransactionsTable = () => (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50/80 text-gray-600 font-medium border-b border-gray-200">
          <tr>
            <th className="py-3 px-4">Thời gian</th>
            <th className="py-3 px-4">Loại biến động</th>
            <th className="py-3 px-4">Mặt hàng</th>
            <th className="py-3 px-4 text-center">Số lượng</th>
            <th className="py-3 px-4 text-center">Tồn trước → sau</th>
            <th className="py-3 px-4">Người thực hiện</th>
            <th className="py-3 px-4">Ghi chú & Tham chiếu</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filteredTransactions.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-12 text-center text-gray-400">
                <History className="mx-auto mb-2 text-gray-300" size={32} />
                {searchTerm ? 'Không tìm thấy giao dịch nào phù hợp' : 'Chưa có biến động kho nào'}
              </td>
            </tr>
          ) : filteredTransactions.map((tx: any) => {
            const isTreatmentUsage = tx.transactionType === 'TREATMENT_USAGE' || tx.transactionType === 'TREATMENT_USE';
            const isImport = tx.transactionType === 'IMPORT';
            const itemName = tx.medicine?.name || tx.supply?.name || 'Mặt hàng';
            const isMedicine = !!tx.medicine;
            const formattedDate = tx.createdAt 
              ? new Date(tx.createdAt).toLocaleString('vi-VN', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric' 
                }) 
              : '---';

            return (
              <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                {/* Thời gian */}
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap text-xs font-mono">
                  {formattedDate}
                </td>

                {/* Loại giao dịch */}
                <td className="py-3 px-4 whitespace-nowrap">
                  {isTreatmentUsage ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <ArrowDownRight size={12} className="text-purple-600" /> Trừ kho điều trị
                    </span>
                  ) : isImport ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ArrowUpRight size={12} className="text-emerald-600" /> Nhập kho
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {tx.transactionType}
                    </span>
                  )}
                </td>

                {/* Mặt hàng */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {isMedicine ? (
                      <Pill size={16} className="text-blue-500 shrink-0" />
                    ) : (
                      <Package size={16} className="text-teal-500 shrink-0" />
                    )}
                    <span className="font-semibold text-gray-800">{itemName}</span>
                  </div>
                </td>

                {/* Số lượng */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span className={`inline-flex items-center font-bold px-2 py-0.5 rounded text-xs ${
                    isTreatmentUsage ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {isTreatmentUsage ? '-' : '+'}{tx.quantity} {tx.unit}
                  </span>
                </td>

                {/* Tồn trước -> sau */}
                <td className="py-3 px-4 text-center whitespace-nowrap">
                  <span className="text-xs text-gray-500 font-mono">
                    {tx.balanceBefore} → <strong className="text-gray-800 font-semibold">{tx.balanceAfter}</strong> {tx.unit}
                  </span>
                </td>

                {/* Người thực hiện */}
                <td className="py-3 px-4 text-gray-700 text-xs">
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={13} className="text-gray-400 shrink-0" />
                    <span className="font-medium">{tx.createdBy?.fullName || tx.createdById || 'Hệ thống'}</span>
                  </div>
                </td>

                {/* Ghi chú & Tham chiếu */}
                <td className="py-3 px-4 text-xs text-gray-600 max-w-xs">
                  <div className="space-y-0.5">
                    {tx.referenceId && (
                      <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                        <FileText size={11} /> Ca điều trị: #{tx.referenceId.slice(0, 8)}
                      </div>
                    )}
                    <div className="truncate text-gray-600" title={tx.notes || ''}>
                      {tx.notes || 'Không có ghi chú'}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <button 
          type="button"
          onClick={() => { setActiveTab('medicines'); setShowAddForm(false); setEditingId(null); }}
          className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'medicines' 
              ? 'text-blue-700 border-b-2 border-blue-600 bg-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Pill size={16} /> Thuốc & Dược phẩm ({medicines.length})
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('supplies'); setShowAddForm(false); setEditingId(null); }}
          className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'supplies' 
              ? 'text-teal-700 border-b-2 border-teal-600 bg-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package size={16} /> Vật tư tiêu hao ({supplies.length})
        </button>
        <button 
          type="button"
          onClick={() => { setActiveTab('transactions'); setShowAddForm(false); setEditingId(null); }}
          className={`flex-1 py-4 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'transactions' 
              ? 'text-purple-700 border-b-2 border-purple-600 bg-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={16} /> Lịch sử xuất nhập & Trừ kho ({transactions.length})
        </button>
      </div>

      <div className="p-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'transactions' 
                    ? 'Tìm thuốc, vật tư, ca, người thực hiện...' 
                    : `Tìm kiếm ${activeTab === 'medicines' ? 'thuốc' : 'vật tư'}...`
                } 
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {activeTab === 'transactions' && (
              <div className="flex items-center gap-2">
                <select
                  value={txTypeFilter}
                  onChange={e => setTxTypeFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">Tất cả biến động</option>
                  <option value="TREATMENT_USAGE">Chỉ trừ kho ca điều trị</option>
                  <option value="IMPORT">Nhập kho</option>
                  <option value="EXPORT">Xuất kho</option>
                </select>

                <button
                  type="button"
                  onClick={handleRefreshTransactions}
                  disabled={isRefreshingTx}
                  className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  title="Làm mới danh sách"
                >
                  <RefreshCw size={16} className={isRefreshingTx ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
          </div>

          {activeTab !== 'transactions' && (
            <button 
              type="button"
              onClick={() => { setShowAddForm(!showAddForm); setEditingId(null); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors cursor-pointer shrink-0 ${
                activeTab === 'medicines' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              <Plus size={18} /> Thêm mới
            </button>
          )}
        </div>

        {/* Form Thêm mới (Chỉ hiển thị khi nhấn '+ Thêm mới' ở tab thuốc/vật tư) */}
        {showAddForm && activeTab !== 'transactions' && (
          <div className="mb-8 p-5 bg-gray-50 border border-gray-200 rounded-xl relative animate-in fade-in slide-in-from-top-4 shadow-sm">
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Plus size={18} className="text-indigo-600" />
              Thêm mới {activeTab === 'medicines' ? 'Thuốc' : 'Vật tư'}
            </h3>
            <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên {activeTab === 'medicines' ? 'thuốc' : 'vật tư'}</label>
                <input required type="text" value={addFormData.name} onChange={e => setAddFormData({...addFormData, name: e.target.value})} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="VD: Botox Allergan, Hyaluronic Acid..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị tính</label>
                <input required type="text" value={addFormData.unit} onChange={e => setAddFormData({...addFormData, unit: e.target.value})} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" placeholder="VD: Lọ, ml, Ống, Miếng..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đơn giá (VNĐ)</label>
                <input required type="number" min="0" value={addFormData.unitCost} onChange={e => setAddFormData({...addFormData, unitCost: Number(e.target.value)})} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho hiện tại</label>
                <input required type="number" min="0" value={addFormData.stock} onChange={e => setAddFormData({...addFormData, stock: Number(e.target.value)})} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cảnh báo tồn kho tối thiểu</label>
                <input required type="number" min="0" value={addFormData.minStock} onChange={e => setAddFormData({...addFormData, minStock: Number(e.target.value)})} className="w-full rounded-md border border-gray-300 p-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div className="col-span-full flex justify-end gap-3 mt-2 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={isAdding} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1.5">
                  {isAdding && <Loader2 size={16} className="animate-spin" />} Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        )}

        {/* View Tabs */}
        {activeTab === 'medicines' && renderTable(filteredMedicines, 'medicines')}
        {activeTab === 'supplies' && renderTable(filteredSupplies, 'supplies')}
        {activeTab === 'transactions' && renderTransactionsTable()}
      </div>
    </div>
  );
}
