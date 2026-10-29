'use client';

import React, { useState } from 'react';

export function ReportsPanel({ reportData }: { reportData: any }) {
  const [dateRange, setDateRange] = useState('This Month');

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const medicines = reportData?.inventory?.medicines || [];
  const supplies = reportData?.inventory?.supplies || [];
  const revenue = reportData?.revenue || 0;

  // Simple statistics
  const lowStockMedicines = medicines.filter((m: any) => Number(m.stock) < 20).length;
  const totalMedicines = medicines.length;
  const lowStockSupplies = supplies.filter((s: any) => Number(s.stock) < 50).length;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Báo cáo & Thống kê</h2>
        <select 
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
        >
          <option value="Today">Hôm nay</option>
          <option value="This Week">Tuần này</option>
          <option value="This Month">Tháng này</option>
          <option value="This Year">Năm nay</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h3 className="text-blue-100 font-medium mb-1 text-sm uppercase tracking-wider">Tổng Doanh Thu</h3>
          <p className="text-3xl font-bold">{formatCurrency(revenue)}</p>
          <div className="mt-4 text-sm text-blue-100 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            <span>+12.5% so với kỳ trước</span>
          </div>
        </div>

        {/* Medicines Stock Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
          <h3 className="text-gray-500 font-medium mb-1 text-sm uppercase tracking-wider">Thuốc sắp hết</h3>
          <p className="text-3xl font-bold text-gray-800">{lowStockMedicines} <span className="text-lg font-normal text-gray-400">/ {totalMedicines} loại</span></p>
          <div className="mt-4 w-full bg-gray-100 rounded-full h-2">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: `${totalMedicines > 0 ? (lowStockMedicines/totalMedicines)*100 : 0}%` }}></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Cần nhập hàng ngay để đảm bảo điều trị</p>
        </div>

        {/* Supplies Stock Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
          <h3 className="text-gray-500 font-medium mb-1 text-sm uppercase tracking-wider">Vật tư cảnh báo</h3>
          <p className="text-3xl font-bold text-gray-800">{lowStockSupplies} <span className="text-lg font-normal text-gray-400">mặt hàng</span></p>
          <div className="mt-4 flex gap-2">
            <button className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded hover:bg-teal-100">Xem chi tiết</button>
            <button className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100">Tạo đơn nhập</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Biểu đồ Doanh thu (Mock)</h3>
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {/* Mock Chart Bars */}
          {[40, 70, 45, 90, 65, 80, 100].map((height, i) => (
            <div key={i} className="w-full bg-gray-100 rounded-t-md relative group">
              <div 
                className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all group-hover:bg-blue-600"
                style={{ height: `${height}%` }}
              ></div>
              <div className="absolute -bottom-6 w-full text-center text-xs text-gray-400">T{i+1}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">Doanh thu 7 tháng gần nhất</div>
      </div>
    </div>
  );
}
