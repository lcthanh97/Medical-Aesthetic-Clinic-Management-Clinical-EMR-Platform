'use client';

import React, { useState } from 'react';
import { useBilling } from '../hooks/useBilling';

export function BillingPanel() {
  const {
    invoices,
    summary,
    currentVisitId,
    setCurrentVisitId,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    loadVisitSummary,
    finalizeInvoice,
    confirmCashPayment,
    createVNPayPayment,
  } = useBilling();

  const [activeTab, setActiveTab] = useState<'FINAL_BILLING' | 'INVOICE_LIST'>('FINAL_BILLING');

  // State Modal thanh toán (BIL-02 & CLS-04: CASH & VNPAY)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<{ id: string; total: number; title: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VNPAY'>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const [cashNotes, setCashNotes] = useState<string>('Thanh toán tiền mặt đủ tại quầy thu ngân');
  const [vnpayBankCode, setVnpayBankCode] = useState<string>('');

  const handleSearchVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentVisitId.trim()) {
      loadVisitSummary(currentVisitId.trim());
    }
  };

  const handleOpenPaymentModal = () => {
    if (!summary?.finalInvoiceId) return;
    setSelectedInvoice({
      id: summary.finalInvoiceId,
      total: summary.amountDue,
      title: 'Thanh Toán Hóa Đơn Cuối Lượt Khám',
    });
    setCashReceived(summary.amountDue);
    setShowPaymentModal(true);
  };

  const handleOpenInvoicePayment = (inv: typeof invoices[0]) => {
    setSelectedInvoice({
      id: inv.id,
      total: inv.total,
      title: `Thanh Toán Hóa Đơn: ${inv.id}`,
    });
    setCashReceived(inv.total);
    setShowPaymentModal(true);
  };

  const handleProcessCashPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const invoiceId = selectedInvoice?.id || summary?.finalInvoiceId;
    if (!invoiceId) return;

    try {
      await confirmCashPayment({
        invoiceId,
        amountReceived: cashReceived,
        notes: cashNotes,
      });
      setShowPaymentModal(false);
      setSelectedInvoice(null);
    } catch {
      // Error handled by hook
    }
  };

  const handleProcessVNPayPayment = async () => {
    const invoiceId = selectedInvoice?.id || summary?.finalInvoiceId;
    if (!invoiceId) return;

    try {
      const result = await createVNPayPayment({
        invoiceId,
        bankCode: vnpayBankCode || undefined,
      });

      if (result && result.paymentUrl) {
        // Chuyển hướng người dùng sang cổng VNPay Sandbox
        window.location.href = result.paymentUrl;
      }
    } catch {
      // Error handled by hook
    }
  };

  const activeInvoiceTotal = selectedInvoice?.total ?? summary?.amountDue ?? 0;
  const changeDue = Math.max(0, cashReceived - activeInvoiceTotal);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header Module */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hóa Đơn & Thanh Toán Cuối Lượt Khám
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Tổng hợp tiền khám, tiền thuốc, loại trừ các khoản CLS đã trả trước, hỗ trợ thu tiền mặt và VNPay Sandbox.
          </p>
        </div>

        {/* Tab chuyển đổi */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('FINAL_BILLING')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'FINAL_BILLING'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bảng kê & Thanh toán cuối lượt
          </button>
          <button
            onClick={() => setActiveTab('INVOICE_LIST')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === 'INVOICE_LIST'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Danh sách tất cả hóa đơn ({invoices.length})
          </button>
        </div>
      </div>

      {/* Thông báo Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 font-medium">
          {successMessage}
        </div>
      )}

      {/* TAB 1: BẢNG KÊ & THANH TOÁN CUỐI LƯỢT (BIL-01 & BIL-02) */}
      {activeTab === 'FINAL_BILLING' && (
        <div className="flex flex-col gap-6">
          {/* Thanh tra cứu Lượt khám */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearchVisit} className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Mã lượt khám (Visit ID):
              </label>
              <input
                type="text"
                value={currentVisitId}
                onChange={(e) => setCurrentVisitId(e.target.value)}
                placeholder="Nhập mã lượt khám..."
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-64"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                {isLoading ? 'Đang tải...' : 'Tra cứu bảng kê'}
              </button>
            </form>

            {summary && (
              <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                <span className="text-slate-500">Trạng thái hóa đơn:</span>
                {summary.finalInvoiceStatus === 'PAID' ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                    ĐÃ THANH TOÁN (PAID)
                  </span>
                ) : summary.finalInvoiceId ? (
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                    CHỜ THANH TOÁN (UNPAID)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                    Chưa chốt hóa đơn cuối
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Chi tiết Bảng kê chi phí */}
          {summary ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Bảng kê 4 nhóm chi tiết (8 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col gap-5">
                  <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Bảng Kê Chi Phí Lượt Khám Bệnh
                      </h2>
                      <p className="text-xs text-slate-500">
                        Bệnh nhân: <strong>{summary.patientName || 'Khách hàng'}</strong> • Bác sĩ khám: <strong>{summary.doctorName || 'Bác sĩ chuyên khoa'}</strong>
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-400">
                      Visit: {summary.visitId}
                    </span>
                  </div>

                  {/* Bảng danh sách chi phí */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                          <th className="py-2.5 px-3">Hạng mục chi phí</th>
                          <th className="py-2.5 px-3 text-center">Số lượng</th>
                          <th className="py-2.5 px-3 text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 text-right">Thành tiền</th>
                          <th className="py-2.5 px-3 text-center">Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {summary.items.map((item) => (
                          <tr
                            key={item.id}
                            className={
                              item.isPrepaid
                                ? 'bg-slate-50/60 text-slate-400 hover:bg-slate-50'
                                : 'hover:bg-slate-50/80 text-slate-800'
                            }
                          >
                            <td className="py-3 px-3">
                              <div className="font-semibold">{item.name}</div>
                              {item.dosage && (
                                <div className="text-[11px] text-slate-500 italic">Liều dùng: {item.dosage}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                            <td className="py-3 px-3 text-right font-mono">
                              {item.unitPrice.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold">
                              {item.totalPrice.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.isPrepaid ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                                  ĐÃ TRẢ TRƯỚC (CLS)
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                  CẦN THU LẦN NÀY
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Chú thích CLS đã trả trước */}
                  {summary.prepaidAmount > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                      <div>
                        <strong>Quy tắc loại trừ tiền CLS đã trả trước:</strong> Khoản tiền Cận lâm sàng{' '}
                        <strong>{summary.prepaidAmount.toLocaleString('vi-VN')} VNĐ</strong> đã được thanh toán trước đó
                        qua quy trình CLS để thực hiện dịch vụ. Hệ thống <strong>không cộng dồn</strong> khoản này vào
                        số tiền phải thanh toán lần cuối.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: Tổng kết tài chính & Phương thức thanh toán (4 cols) */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
                    Tổng Kết Nghĩa Vụ Tài Chính
                  </h3>

                  <div className="flex flex-col gap-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>1. Tiền khám bệnh:</span>
                      <span className="font-mono font-medium">{summary.examinationFee.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>2. Tiền thuốc kê đơn:</span>
                      <span className="font-mono font-medium">{summary.medicationFee.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>3. Thủ thuật phát sinh:</span>
                      <span className="font-mono font-medium">{summary.procedureFee.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="border-t border-slate-100 pt-2 flex justify-between text-slate-500 italic">
                      <span>Đã thanh toán trước (CLS):</span>
                      <span className="font-mono">-{summary.prepaidAmount.toLocaleString('vi-VN')} đ</span>
                    </div>

                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex flex-col gap-1 mt-2">
                      <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">
                        Số tiền cần thanh toán lần này:
                      </span>
                      <span className="text-2xl font-black text-teal-900 font-mono">
                        {summary.amountDue.toLocaleString('vi-VN')} VNĐ
                      </span>
                      <span className="text-[10px] text-teal-700">
                        (Tổng chi phí toàn đợt khám: {summary.totalExpense.toLocaleString('vi-VN')} đ)
                      </span>
                    </div>
                  </div>

                  {/* Các nút hành động */}
                  <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                    {!summary.finalInvoiceId ? (
                      <button
                        type="button"
                        onClick={() => finalizeInvoice(summary.visitId)}
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-bold shadow transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? 'Đang tạo...' : 'Lập Hóa Đơn Cuối Lượt'}
                      </button>
                    ) : summary.finalInvoiceStatus === 'PAID' ? (
                      <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-lg text-center text-xs font-bold text-emerald-800">
                        Hóa đơn đã được thanh toán đầy đủ. Đơn thuốc đã sẵn sàng cấp phát tại Quầy Dược.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleOpenPaymentModal}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        Tiến Hành Thanh Toán ({summary.amountDue.toLocaleString('vi-VN')} đ)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400 text-sm shadow-sm">
              Vui lòng nhập mã lượt khám hợp lệ ở trên để tải bảng kê chi phí cuối lượt.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DANH SÁCH TẤT CẢ HÓA ĐƠN TRONG HỆ THỐNG */}
      {activeTab === 'INVOICE_LIST' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-800">
              Danh Sách Hóa Đơn Khám Bệnh & Dịch Vụ
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Tổng số: <strong>{invoices.length}</strong> hóa đơn
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                  <th className="py-3 px-4">Mã hóa đơn</th>
                  <th className="py-3 px-4">Mã lượt khám</th>
                  <th className="py-3 px-4 text-right">Tổng tiền</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Giao dịch thanh toán</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{inv.id}</td>
                    <td className="py-3 px-4 font-mono">{inv.visitId}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {inv.total.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status === 'PAID' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          ĐÃ THANH TOÁN
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          CHỜ THANH TOÁN
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.payments && inv.payments.length > 0 ? (
                        <span className="font-mono text-slate-600">
                          {inv.payments[0].method} ({new Date(inv.payments[0].paidAt).toLocaleTimeString('vi-VN')})
                        </span>
                      ) : (
                        <span className="text-slate-400">Chưa có giao dịch</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status !== 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenInvoicePayment(inv)}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        >
                          Thu tiền (Cash/VNPay)
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs">Hoàn tất</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL THANH TOÁN (BIL-02 & CLS-04: CASH & VNPAY SANDBOX) */}
      {showPaymentModal && (selectedInvoice || summary) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedInvoice?.title || 'Thanh Toán Hóa Đơn'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedInvoice(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Mã hóa đơn:</span>{' '}
                <strong className="font-mono">{selectedInvoice?.id || summary?.finalInvoiceId}</strong>
              </div>
              <div>
                <span className="text-slate-500">Số tiền phải thu:</span>{' '}
                <strong className="font-mono text-teal-700 text-sm">
                  {activeInvoiceTotal.toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            {/* Lựa chọn phương thức thanh toán */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Chọn phương thức thanh toán:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMethod === 'CASH'
                      ? 'bg-teal-50 border-teal-600 text-teal-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold">Tiền Mặt (CASH)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VNPAY')}
                  className={`p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    paymentMethod === 'VNPAY'
                      ? 'bg-teal-50 border-teal-600 text-teal-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xs font-semibold">VNPay Sandbox (QR/ATM)</span>
                </button>
              </div>
            </div>

            {/* Giao diện Thanh toán TIỀN MẶT */}
            {paymentMethod === 'CASH' && (
              <form onSubmit={handleProcessCashPayment} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số tiền khách đưa (VND):
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(Number(e.target.value))}
                    min={activeInvoiceTotal}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                    required
                  />
                </div>

                <div className="p-2.5 bg-slate-100 rounded-lg flex justify-between text-xs">
                  <span className="text-slate-600">Tiền thừa trả lại khách:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {changeDue.toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú thu ngân:
                  </label>
                  <input
                    type="text"
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow cursor-pointer"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Thu Tiền Mặt'}
                  </button>
                </div>
              </form>
            )}

            {/* Giao diện Thanh toán VNPAY SANDBOX */}
            {paymentMethod === 'VNPAY' && (
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  Hệ thống sẽ kết nối trực tiếp đến cổng thanh toán <strong>VNPay Sandbox</strong>. Bạn có thể sử dụng
                  ứng dụng Mobile Banking quét mã QR hoặc thẻ ATM nội địa demo để hoàn tất giao dịch.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn ngân hàng / Phương thức (Tùy chọn):
                  </label>
                  <select
                    value={vnpayBankCode}
                    onChange={(e) => setVnpayBankCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="">Cổng VNPay (Quét QR hoặc chọn ngân hàng tại cổng)</option>
                    <option value="VNPAYQR">Cổng thanh toán VNPAYQR</option>
                    <option value="NCB">Ngân hàng Quốc dân (NCB Test)</option>
                    <option value="VIETCOMBANK">Ngân hàng Vietcombank</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessVNPayPayment}
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? 'Đang chuyển hướng...' : 'Chuyển Hướng Đến VNPay'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
