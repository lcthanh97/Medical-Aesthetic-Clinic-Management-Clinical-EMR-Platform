export interface ImagingOrderRecord {
  id: string;
  type: string;
  status: string;
  orderedAt: Date;
  orderedBy: { fullName: string } | null;
  service: { code: string; name: string } | null;
  visit: {
    id: string;
    employeeId: string | null;
    visitDate: Date;
    status: string;
    patient: { patientCode: string; fullName: string };
  };
  imagingResults: Array<{
    id: string;
    imagingType: string;
    conclusion: string;
    fileUrl: string | null;
  }>;
}

export interface IClinicalServicesRepository {
  findImagingOrdersForEmployee(employeeId: string, search?: string): Promise<ImagingOrderRecord[]>;
  findImagingOrderForEmployee(orderId: string, employeeId: string): Promise<ImagingOrderRecord | null>;
  findImagingResultScopeForEmployee(resultId: string, employeeId: string): Promise<{ orderId: string; type: string; status: string } | null>;
  createImagingResultForAssignedOrder(employeeId: string, orderId: string, input: { imagingType: string; conclusion: string }): Promise<string>;
  updateImagingResultForAssignedOrder(employeeId: string, resultId: string, input: { imagingType: string; conclusion: string }): Promise<string>;
}
