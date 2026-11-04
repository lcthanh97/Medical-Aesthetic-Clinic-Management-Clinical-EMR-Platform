export interface CreateOrderInput {
  visitId: string;
  type: string;
  status: string;
}

export interface CreateLabResultInput {
  orderId: string;
  testName: string;
  result: string;
  unit?: string;
}

export interface CreateImagingResultInput {
  orderId: string;
  imagingType: string;
  conclusion: string;
  fileUrl?: string;
}

export interface ClsCatalogService {
  code: string;
  name: string;
  price: number;
  type: 'LABORATORY' | 'IMAGING';
  description?: string;
}

export interface IClinicalServicesRepository {
  createOrder(input: CreateOrderInput): Promise<any>;
  findOrderById(id: string): Promise<any | null>;
  findOrdersByVisitId(visitId: string): Promise<any[]>;
  updateOrderStatus(id: string, status: string): Promise<any>;
  createLabResult(input: CreateLabResultInput): Promise<any>;
  createImagingResult(input: CreateImagingResultInput): Promise<any>;
  findLinkedInvoiceForOrder(orderId: string): Promise<any | null>;
  createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void>;
  findAuditLogByActionAndEntity(actionPrefix: string, entity: string, entityId: string): Promise<any | null>;
  getServicesCatalog(): Promise<ClsCatalogService[]>;
  getServiceByCode(code: string): Promise<ClsCatalogService | null>;
}
