export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface CashPaymentDto {
  invoiceId: string;
  notes?: string;
}

export interface InvoiceItemDetail {
  serviceCode: string;
  serviceName: string;
  price: number;
}

export interface InvoiceDto {
  id: string;
  visitId: string;
  total: number;
  status: 'UNPAID' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  orderId?: string | null;
  items?: InvoiceItemDetail[];
  payments?: PaymentDto[];
}

export interface PaymentDto {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  paidAt: string;
}

export interface PaymentConfirmResponse {
  payment: PaymentDto;
  invoice: InvoiceDto;
  orderId?: string | null;
  orderStatus?: string | null;
  message: string;
}
