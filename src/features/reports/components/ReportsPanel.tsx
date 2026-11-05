'use client';

import React from 'react';

export function ReportsPanel({ reportData }: { reportData: any }) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const medicines = reportData?.inventory?.medicines || [];
  const supplies = reportData?.inventory?.supplies || [];
  const revenue = reportData?.revenue || 0;
  const revenueByDay = reportData?.revenueByDay || [];
  const maxRevenue = Math.max(1,...revenueByDay.map((item:any)=>Number(item.amount)));

  // Simple statistics
  const lowStockMedicines = medicines.filter((m: any) => Number(m.stock) < 20).length;
  const totalMedicines = medicines.length;
  const lowStockSupplies = supplies.filter((s: any) => Number(s.stock) < 50).length;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Báo cáo & Thống kê</h2>
        <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">Dữ liệu tháng hiện tại</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Revenue Card */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl"></div>
          <h3 className="text-blue-100 font-medium mb-1 text-sm uppercase tracking-wider">Tổng Doanh Thu</h3>
          <p className="text-3xl font-bold">{formatCurrency(revenue)}</p>
          <div className="mt-4 text-sm text-blue-100">{Number(reportData?.paymentCount||0).toLocaleString('vi-VN')} giao dịch đã thanh toán</div>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Doanh thu theo ngày</h3>
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {revenueByDay.map((item:any) => (
            <div key={item.date} className="w-full bg-gray-100 rounded-t-md relative group" title={formatCurrency(item.amount)}>
              <div 
                className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all group-hover:bg-blue-600"
                style={{ height: `${Math.max(3,Number(item.amount)/maxRevenue*100)}%` }}
              ></div>
              <div className="absolute -bottom-6 w-full text-center text-[10px] text-gray-400">{String(item.date).slice(8,10)}</div>
            </div>
          ))}
          {revenueByDay.length===0&&<p className="m-auto text-sm text-gray-500">Chưa có giao dịch thanh toán trong tháng.</p>}
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">Tổng hợp trực tiếp từ bảng Payment</div>
      </div>
    </div>
  );
}
