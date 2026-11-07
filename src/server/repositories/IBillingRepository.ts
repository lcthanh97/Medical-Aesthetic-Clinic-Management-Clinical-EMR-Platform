export interface CreateInvoiceInput {
  visitId: string;
  total: number;
  status: string;
}

export interface CreatePaymentInput {
  invoiceId: string;
  amount: number;
  method: string;
  paidAt: Date;
}

export interface IBillingRepository {
  findById(id: string): Promise<any | null>;
  findMany(): Promise<any[]>;
  findInvoiceById(id: string): Promise<any | null>;
  createInvoice(input: CreateInvoiceInput): Promise<any>;
  updateInvoiceStatus(id: string, status: string): Promise<any>;
  updateInvoiceTotal(id: string, total: number): Promise<any>;
  createPayment(input: CreatePaymentInput): Promise<any>;
  recordPaymentAndUpdateInvoice(input: CreatePaymentInput, status: string): Promise<{ payment: any; invoice: any }>;
  findPaymentsByInvoiceId(invoiceId: string): Promise<any[]>;
  createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void>;
  findAuditLogByActionAndEntity(actionPrefix: string, entity: string, entityId: string): Promise<any | null>;

  // BIL-01 & BIL-02: Tổng hợp chi phí lượt khám & đơn thuốc
  findVisitWithDetails(visitId: string): Promise<any | null>;
  findFinalInvoiceForVisit(visitId: string): Promise<any | null>;
  findInvoicesByVisitId(visitId: string): Promise<any[]>;
  updatePrescriptionStatus(prescriptionId: string, status: string): Promise<any>;
}
