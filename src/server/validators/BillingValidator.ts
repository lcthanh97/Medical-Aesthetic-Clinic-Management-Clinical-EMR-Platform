import {
  CashPaymentSchema,
  FinalizeVisitInvoiceSchema,
  CreateVNPayPaymentSchema,
} from '@/features/billing/schemas/billing.schema';
import type {
  CashPaymentDto,
  FinalizeVisitInvoiceDto,
  CreateVNPayPaymentDto,
} from '@/features/billing/types/billing.types';

export class BillingValidator {
  static validateFinalizeInvoice(data: unknown): FinalizeVisitInvoiceDto {
    return FinalizeVisitInvoiceSchema.parse(data);
  }

  static validateCashPayment(data: unknown): CashPaymentDto {
    return CashPaymentSchema.parse(data);
  }

  static validateCreateVNPay(data: unknown): CreateVNPayPaymentDto {
    return CreateVNPayPaymentSchema.parse(data);
  }
}
