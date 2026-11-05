import { describe, it, expect } from 'vitest';
import { ClinicalServicePaymentPolicy } from '../../../src/domain/policies/ClinicalServicePaymentPolicy';
import { DomainError } from '../../../src/domain/errors/DomainError';
import { OrderStatus, PaymentStatus } from '../../../src/domain/enums';

describe('CLS-04: ClinicalServicePaymentPolicy Unit Tests (Payment Guard)', () => {
  it('nên CHẶN ĐỨNG và ném lỗi CLS_PAYMENT_REQUIRED nếu hóa đơn liên kết ở trạng thái UNPAID', () => {
    const mockOrder = {
      id: 'order-01',
      status: OrderStatus.AWAITING_PAYMENT,
      visitId: 'visit-01',
    };

    const mockUnpaidInvoice = {
      id: 'inv-01',
      status: PaymentStatus.UNPAID,
      total: 350000,
    };

    expect(() => {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, mockUnpaidInvoice);
    }).toThrow(DomainError);

    try {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, mockUnpaidInvoice);
    } catch (err: any) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err.code).toBe('CLS_PAYMENT_REQUIRED');
      expect(err.message).toBe('Bệnh nhân cần hoàn tất thanh toán trước khi thực hiện cận lâm sàng.');
    }
  });

  it('nên CHẶN ĐỨNG nếu hóa đơn ở trạng thái PARTIAL hoặc REFUNDED', () => {
    const mockOrder = {
      id: 'order-01',
      status: OrderStatus.AWAITING_PAYMENT,
      visitId: 'visit-01',
    };

    const mockPartialInvoice = {
      id: 'inv-01',
      status: PaymentStatus.PARTIAL,
      total: 350000,
    };

    expect(() => {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, mockPartialInvoice);
    }).toThrow(DomainError);

    try {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, mockPartialInvoice);
    } catch (err: any) {
      expect(err.code).toBe('CLS_PAYMENT_REQUIRED');
    }
  });

  it('nên CHẶN ĐỨNG nếu lệnh CLS chưa có bất kỳ hóa đơn nào liên kết (INVOICE_NOT_FOUND)', () => {
    const mockOrder = {
      id: 'order-01',
      status: OrderStatus.AWAITING_PAYMENT,
      visitId: 'visit-01',
    };

    expect(() => {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, null);
    }).toThrow(DomainError);

    try {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, null);
    } catch (err: any) {
      expect(err.code).toBe('INVOICE_NOT_FOUND');
    }
  });

  it('nên CHẶN ĐỨNG nếu lệnh chỉ định đã bị hủy (ORDER_CANCELLED)', () => {
    const mockCancelledOrder = {
      id: 'order-01',
      status: OrderStatus.CANCELLED,
      visitId: 'visit-01',
    };

    const mockPaidInvoice = {
      id: 'inv-01',
      status: PaymentStatus.PAID,
      total: 350000,
    };

    expect(() => {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockCancelledOrder, mockPaidInvoice);
    }).toThrow(DomainError);

    try {
      ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockCancelledOrder, mockPaidInvoice);
    } catch (err: any) {
      expect(err.code).toBe('ORDER_CANCELLED');
    }
  });

  it('nên CHO PHÉP thực hiện khi hóa đơn đã thanh toán đầy đủ (PaymentStatus.PAID) và lệnh hợp lệ', () => {
    const mockOrder = {
      id: 'order-01',
      status: OrderStatus.READY,
      visitId: 'visit-01',
    };

    const mockPaidInvoice = {
      id: 'inv-01',
      status: PaymentStatus.PAID,
      total: 350000,
    };

    const canExecute = ClinicalServicePaymentPolicy.ensureOrderCanExecute(mockOrder, mockPaidInvoice);
    expect(canExecute).toBe(true);
  });
});
