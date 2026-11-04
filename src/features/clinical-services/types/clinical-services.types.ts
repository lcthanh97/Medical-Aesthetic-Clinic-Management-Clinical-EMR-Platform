export type ClinicalOrderType = 'LABORATORY' | 'IMAGING' | 'DERMATOLOGY_PROCEDURE';

export interface ClsRequestedServiceItem {
  serviceCode: string;
  serviceName: string;
  price: number;
  notes?: string;
}

export interface CreateClinicalOrderDto {
  visitId: string;
  type: ClinicalOrderType | string;
  services: Array<{
    serviceCode: string;
    notes?: string;
  }>;
}

export interface ClinicalOrderItem {
  id: string;
  visitId: string;
  type: string;
  status: string; // CREATED | AWAITING_PAYMENT | READY | IN_PROGRESS | COMPLETED | CANCELLED
  services: ClsRequestedServiceItem[];
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  isPaid: boolean;
  canExecute: boolean;
  labResults?: Array<{
    id: string;
    testName: string;
    result: string;
    unit?: string | null;
  }>;
  imagingResults?: Array<{
    id: string;
    imagingType: string;
    conclusion: string;
    fileUrl?: string | null;
  }>;
}

export interface SubmitLabResultItem {
  testName: string;
  result: string;
  unit?: string;
}

export interface SubmitImagingResultItem {
  imagingType: string;
  conclusion: string;
  fileUrl?: string;
}

export interface SubmitResultsDto {
  labResults?: SubmitLabResultItem[];
  imagingResults?: SubmitImagingResultItem[];
  notes?: string;
}

export interface ClsPaymentStatusResponse {
  orderId: string;
  status: string;
  isPaid: boolean;
  canExecute: boolean;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  totalAmount?: number;
  paidAt?: string | null;
}
