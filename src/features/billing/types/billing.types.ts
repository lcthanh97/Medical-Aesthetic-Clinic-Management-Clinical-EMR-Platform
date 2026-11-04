export type PaymentMethod = 'CASH' | 'VNPAY' | 'CARD' | 'TRANSFER';

export type BillingItemCategory = 'EXAMINATION' | 'MEDICATION' | 'PROCEDURE' | 'PREPAID_CLS';

export interface BillingItemDetail {
  id: string;
  category: BillingItemCategory;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isPrepaid: boolean; // Nếu true: Khoản CLS đã thanh toán trước (tham khảo, không cộng vào số tiền phải thu)
  referenceId?: string;
  dosage?: string;
}

export interface BillingSummaryDto {
  visitId: string;
  patientId?: string;
  patientName?: string;
  doctorName?: string;
  visitDate?: string;
  items: BillingItemDetail[];
  examinationFee: number;
  medicationFee: number;
  procedureFee: number;
  prepaidAmount: number; // Tổng các khoản CLS đã trả trước
  amountDue: number; // Số tiền thực tế phải thu lần này = Khám + Thuốc + Thủ thuật chưa thu
  totalExpense: number; // Tổng chi phí toàn đợt = amountDue + prepaidAmount
  finalInvoiceId?: string | null;
  finalInvoiceStatus?: string | null;
}

export interface FinalizeVisitInvoiceDto {
  visitId: string;
  notes?: string;
}

export interface CashPaymentDto {
  invoiceId: string;
  amountReceived?: number;
  notes?: string;
}

export interface CreateVNPayPaymentDto {
  invoiceId: string;
  bankCode?: string;
  language?: string;
}

export interface VNPayPaymentResponse {
  paymentUrl: string;
  transactionRef: string;
  amount: number;
  message: string;
}

export interface InvoiceItemDetail {
  serviceCode: string;
  serviceName: string;
  price: number;
  quantity?: number;
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paidAt: string;
}

export interface InvoiceDto {
  id: string;
  visitId: string;
  total: number;
  status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  orderId?: string | null;
  items?: InvoiceItemDetail[];
  payments?: PaymentDto[];
  isFinalInvoice?: boolean;
}

export interface PaymentConfirmResponse {
  payment: PaymentDto;
  invoice: InvoiceDto;
  orderId?: string | null;
  orderStatus?: string | null;
  prescriptionsUpdated?: number;
  message: string;
}
