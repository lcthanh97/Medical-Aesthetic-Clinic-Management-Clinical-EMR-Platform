'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Printer, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import type { InvoiceDto } from '../types/billing.types';

interface PaymentSuccessPanelProps {
  invoiceId: string;
}

export function PaymentSuccessPanel({ invoiceId }: PaymentSuccessPanelProps) {
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoiceData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/payments/${encodeURIComponent(invoiceId)}`);
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.error?.details || payload.message || 'Không thể tải thông tin hóa đơn');
      }

      setInvoice(payload.data);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải dữ liệu hóa đơn từ hệ thống.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceData();
    }
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[9px] border border-[#dce5ef] shadow-2xs text-[#20334b]">
        <RefreshCw size={28} className="animate-spin text-[#246dce] mb-3" />
        <p className="text-xs text-[#6c7e93]">Đang truy xuất dữ liệu hóa đơn đã thanh toán từ hệ thống...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 bg-white rounded-[9px] border border-[#dce5ef] shadow-2xs text-[#20334b]">
        <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-[7px] text-xs text-rose-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <b className="block text-sm font-bold">Không tìm thấy thông tin hóa đơn</b>
            <p className="mt-1">{error || `Không có dữ liệu cho hóa đơn mã: ${invoiceId}`}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchInvoiceData}
            className="px-3.5 py-2 text-xs font-semibold rounded-[7px] bg-[#246dce] text-white hover:bg-[#1f5cb0] cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Thử lại
          </button>
          <Link
            href="/letan/billing"
            className="px-3.5 py-2 text-xs font-semibold rounded-[7px] border border-[#dce5ef] text-[#20334b] hover:bg-[#f8fafd] inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Quay lại danh sách hóa đơn
          </Link>
        </div>
      </div>
    );
  }

  // BẢO VỆ NGHIỆP VỤ: Nếu hóa đơn chưa ở trạng thái PAID thì không hiển thị thành công
  if (invoice.status !== 'PAID') {
    return (
      <div className="p-6 bg-white rounded-[9px] border border-[#dce5ef] shadow-2xs text-[#20334b]">
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-[7px] text-xs text-amber-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="flex-1">
            <b className="block text-sm font-bold">Hóa đơn chưa hoàn tất thanh toán</b>
            <p className="mt-1">
              Hóa đơn <strong>{invoice.id}</strong> hiện đang ở trạng thái:{' '}
              <span className="font-semibold uppercase">{invoice.status}</span>.
              Chỉ hóa đơn đã được xác nhận thanh toán (PAID) mới có biên lai xác nhận thành công.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={fetchInvoiceData}
            className="px-3.5 py-2 text-xs font-semibold rounded-[7px] bg-[#246dce] text-white hover:bg-[#1f5cb0] cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw size={14} /> Kiểm tra lại trạng thái
          </button>
          <Link
            href="/letan/billing"
            className="px-3.5 py-2 text-xs font-semibold rounded-[7px] border border-[#dce5ef] text-[#20334b] hover:bg-[#f8fafd] inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Quay lại danh sách hóa đơn
          </Link>
        </div>
      </div>
    );
  }

  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
    {
      serviceCode: 'FEE',
      serviceName: 'Dịch vụ y tế & Viện phí lâm sàng',
      price: invoice.total,
      quantity: 1,
    },
  ];

  const paymentMethodLabel =
    invoice.paymentMethod === 'VNPAY'
      ? 'Cổng VNPay Sandbox'
      : invoice.paymentMethod === 'CARD'
      ? 'Thẻ ngân hàng'
      : invoice.paymentMethod === 'TRANSFER'
      ? 'Chuyển khoản'
      : 'Tiền mặt (Cash)';

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-5 text-[#20334b]">
      {/* 4.1. Phần thông báo thành công */}
      <section className="print:hidden rounded-[9px] border border-[#dce5ef] bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-[#edf5ff] flex items-center justify-center text-[#246dce] shrink-0">
              <CheckCircle2 size={30} />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-[#20334b] tracking-tight">
                THANH TOÁN THÀNH CÔNG
              </h1>
              <p className="text-xs text-[#6c7e93] mt-0.5">
                Hóa đơn đã được thanh toán và ghi nhận thành công vào hệ thống phòng khám.
              </p>
            </div>
          </div>

          {/* Các nút thao tác */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 text-xs font-semibold rounded-[7px] bg-[#246dce] text-white hover:bg-[#1f5cb0] shadow-2xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
            >
              <Printer size={15} /> In hóa đơn
            </button>
            <Link
              href="/letan/billing"
              className="px-3.5 py-2 text-xs font-semibold rounded-[7px] border border-[#dce5ef] text-[#20334b] bg-white hover:bg-[#f8fafd] shadow-2xs inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={15} /> Quay lại danh sách
            </Link>
          </div>
        </div>
      </section>

      {/* KHUNG HÓA ĐƠN Y TẾ ĐIỆN TỬ - TỐI ƯU CẢ MÀN HÌNH VÀ BẢN IN KHỔ A4 */}
      <section
        id="printable-invoice"
        className="rounded-[9px] border border-[#dce5ef] bg-white p-6 md:p-8 shadow-2xs print:border-none print:shadow-none print:p-0"
      >
        {/* Header hóa đơn y tế chuẩn */}
        <div className="border-b-2 border-[#20334b] pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-[#246dce] uppercase block">
              PHÒNG KHÁM CHUYÊN KHOA DA LIỄU & THẨM MỸ Y KHOA
            </span>
            <h2 className="text-[22px] font-bold text-[#20334b] uppercase mt-0.5">
              BIÊN LAI THU VIỆN PHÍ & DỊCH VỤ
            </h2>
            <p className="text-xs text-[#6c7e93] mt-1">
              Địa chỉ: 123 Đường Y Học, Phường Phòng Khám, Quận Y Tế, TP. Hồ Chí Minh
            </p>
          </div>
          <div className="text-left md:text-right text-xs text-[#6c7e93] space-y-0.5">
            <p>
              Mã hóa đơn: <strong className="font-mono text-[#20334b] text-sm">{invoice.id}</strong>
            </p>
            <p>
              Mã lượt khám: <strong className="font-mono text-[#20334b]">{invoice.visitId}</strong>
            </p>
            <p>
              Trạng thái:{' '}
              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#edf5ff] text-[#235f9e]">
                ĐÃ THANH TOÁN
              </span>
            </p>
          </div>
        </div>

        {/* 4.2. Bảng thông tin hành chính & Giao dịch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 text-xs border-b border-[#e6edf5]">
          <div className="space-y-1.5">
            <h3 className="font-bold text-[#20334b] text-[13px] mb-2 uppercase">1. Thông tin Bệnh nhân</h3>
            <p className="flex justify-between md:justify-start gap-4">
              <span className="text-[#6c7e93] w-28">Họ và tên:</span>
              <strong className="text-[#20334b] font-semibold">{invoice.patientName || 'Khách hàng'}</strong>
            </p>
            {invoice.patientCode && (
              <p className="flex justify-between md:justify-start gap-4">
                <span className="text-[#6c7e93] w-28">Mã bệnh nhân:</span>
                <span className="font-mono text-[#20334b]">{invoice.patientCode}</span>
              </p>
            )}
            {invoice.patientPhone && (
              <p className="flex justify-between md:justify-start gap-4">
                <span className="text-[#6c7e93] w-28">Số điện thoại:</span>
                <span className="font-mono text-[#20334b]">{invoice.patientPhone}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-[#20334b] text-[13px] mb-2 uppercase">2. Thông tin Giao dịch</h3>
            <p className="flex justify-between md:justify-start gap-4">
              <span className="text-[#6c7e93] w-36">Phương thức:</span>
              <strong className="text-[#246dce]">{paymentMethodLabel}</strong>
            </p>
            {invoice.transactionId && (
              <p className="flex justify-between md:justify-start gap-4">
                <span className="text-[#6c7e93] w-36">Mã giao dịch:</span>
                <span className="font-mono text-[#20334b]">{invoice.transactionId}</span>
              </p>
            )}
            <p className="flex justify-between md:justify-start gap-4">
              <span className="text-[#6c7e93] w-36">Thời gian thanh toán:</span>
              <span className="text-[#20334b]">{formattedDate(invoice.paidAt)}</span>
            </p>
            {invoice.createdAt && (
              <p className="flex justify-between md:justify-start gap-4">
                <span className="text-[#6c7e93] w-36">Thời gian lập HĐ:</span>
                <span className="text-[#20334b]">{formattedDate(invoice.createdAt)}</span>
              </p>
            )}
          </div>
        </div>

        {/* 4.3. Chi tiết các khoản thanh toán */}
        <div className="mt-4">
          <h3 className="font-bold text-[#20334b] text-[13px] mb-2 uppercase">3. Chi tiết các khoản thanh toán</h3>
          <div className="overflow-x-auto rounded-[7px] border border-[#dce5ef]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#dce5ef] bg-[#f5f8fc] text-[11px] font-semibold text-[#6c7e93]">
                  <th className="py-2.5 px-3 w-12 text-center">STT</th>
                  <th className="py-2.5 px-3">Nội dung khoản thu / Dịch vụ</th>
                  <th className="py-2.5 px-3 w-20 text-center">Số lượng</th>
                  <th className="py-2.5 px-3 text-right w-28">Đơn giá</th>
                  <th className="py-2.5 px-3 text-right w-32">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6edf5] text-xs text-[#20334b]">
                {items.map((item, index) => {
                  const qty = Number(item.quantity || 1);
                  const price = Number(item.price || 0);
                  const lineTotal = qty * price;
                  return (
                    <tr key={index} className="hover:bg-[#f8fafd]">
                      <td className="py-2.5 px-3 text-center text-[#6c7e93]">{index + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="font-semibold block text-[#20334b]">{item.serviceName}</span>
                        {item.serviceCode && (
                          <span className="font-mono text-[10px] text-[#6c7e93]">{item.serviceCode}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">{qty}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{price.toLocaleString('vi-VN')} đ</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">
                        {lineTotal.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#20334b] bg-[#edf5ff]/50 text-xs">
                  <td colSpan={4} className="py-3 px-3 text-right font-bold text-[#20334b] uppercase">
                    Tổng số tiền đã thanh toán:
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[15px] text-[#246dce]">
                    {Number(invoice.total || 0).toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Chữ ký xác nhận trên biên lai */}
        <div className="mt-8 pt-4 grid grid-cols-2 text-center text-xs text-[#20334b]">
          <div>
            <p className="font-bold">Người nộp tiền / Bệnh nhân</p>
            <p className="text-[11px] text-[#6c7e93] italic mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-16"></div>
            <p className="font-semibold">{invoice.patientName || 'Khách hàng'}</p>
          </div>
          <div>
            <p className="font-bold">Thu ngân / Người lập phiếu</p>
            <p className="text-[11px] text-[#6c7e93] italic mt-0.5">(Ký và ghi rõ họ tên)</p>
            <div className="h-16"></div>
            <p className="font-semibold">Bộ phận Lễ tân & Thu ngân</p>
          </div>
        </div>
      </section>

      {/* CSS @media print để in sạch sẽ khổ A4 */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          nav, aside, header, footer, button, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          #printable-invoice {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
