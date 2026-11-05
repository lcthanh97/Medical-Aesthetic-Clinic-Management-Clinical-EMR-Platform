'use client';

import { useState, useEffect, useCallback } from 'react';
import { billingApi } from '../api/billingApi';
import type {
  InvoiceDto,
  BillingSummaryDto,
  CashPaymentDto,
  CreateVNPayPaymentDto,
} from '../types/billing.types';

export function useBilling(initialVisitId?: string) {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [summary, setSummary] = useState<BillingSummaryDto | null>(null);
  const [currentVisitId, setCurrentVisitId] = useState<string>(initialVisitId || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await billingApi.getInvoices();
      if (res.success && res.data) {
        setInvoices(res.data);
      } else {
        setError(res.error?.code || res.message || 'Lỗi khi tải danh sách hóa đơn');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadVisitSummary = useCallback(async (visitId: string) => {
    if (!visitId.trim()) return;
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      const res = await billingApi.getVisitBillingSummary(visitId.trim());
      if (res.success && res.data) {
        setSummary(res.data);
      } else {
        setError(res.error?.code || res.message || 'Không tìm thấy thông tin chi phí của lượt khám');
        setSummary(null);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối khi tải bảng kê chi phí');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
    if (initialVisitId) {
      loadVisitSummary(initialVisitId);
    }
  }, [loadInvoices, loadVisitSummary, initialVisitId]);

  const handleFinalizeInvoice = async (visitId: string) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await billingApi.finalizeVisitInvoice(visitId);
      if (res.success && res.data) {
        setSuccessMessage('Lập hóa đơn cuối lượt khám thành công.');
        await loadVisitSummary(visitId);
        await loadInvoices();
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Lỗi khi lập hóa đơn');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCashPayment = async (dto: CashPaymentDto) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await billingApi.confirmCashPayment(dto);
      if (res.success && res.data) {
        setSuccessMessage(res.data.message || 'Thanh toán tiền mặt thành công.');
        if (summary) {
          await loadVisitSummary(summary.visitId);
        }
        await loadInvoices();
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Lỗi xử lý thanh toán tiền mặt');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVNPayPayment = async (dto: CreateVNPayPaymentDto) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await billingApi.createVNPayPayment(dto);
      if (res.success && res.data) {
        return res.data;
      }
      throw new Error(res.error?.code || res.message || 'Lỗi kết nối cổng thanh toán VNPay');
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    invoices,
    summary,
    currentVisitId,
    setCurrentVisitId,
    isLoading,
    isSubmitting,
    error,
    successMessage,
    loadVisitSummary,
    refreshInvoices: loadInvoices,
    finalizeInvoice: handleFinalizeInvoice,
    confirmCashPayment: handleConfirmCashPayment,
    createVNPayPayment: handleCreateVNPayPayment,
  };
}
