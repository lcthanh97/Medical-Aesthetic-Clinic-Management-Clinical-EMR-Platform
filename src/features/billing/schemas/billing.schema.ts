import { z } from 'zod';

export const FinalizeVisitInvoiceSchema = z.object({
  visitId: z.string().min(1, 'Vui lòng cung cấp mã lượt khám (visitId)'),
  notes: z.string().optional(),
});

export const CashPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Vui lòng cung cấp mã hóa đơn (invoiceId)'),
  amountReceived: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const CreateVNPayPaymentSchema = z.object({
  invoiceId: z.string().min(1, 'Vui lòng cung cấp mã hóa đơn (invoiceId)'),
  bankCode: z.string().optional(),
  language: z.string().optional(),
});

export const BillingSchema = z.object({
  id: z.string().optional(),
});
