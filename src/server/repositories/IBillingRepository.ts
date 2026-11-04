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
  createPayment(input: CreatePaymentInput): Promise<any>;
  findPaymentsByInvoiceId(invoiceId: string): Promise<any[]>;
  createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void>;
  findAuditLogByActionAndEntity(actionPrefix: string, entity: string, entityId: string): Promise<any | null>;
}
