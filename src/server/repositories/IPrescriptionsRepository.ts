import type { PrescriptionItemInput } from '@/features/prescriptions/schemas/prescriptions.schema';

export interface PrescriptionRecord {
  id: string;
  visitId: string;
  employeeId: string;
  status: string;
  employee: { fullName: string };
  visit: {
    id: string;
    employeeId: string | null;
    visitDate: Date;
    status: string;
    patient: { id: string; patientCode: string; fullName: string };
  };
  items: Array<{
    id: string;
    medicineId: string;
    quantity: { toString(): string };
    dosage: string;
    medicine: { id: string; name: string; unit: string; status: string };
  }>;
}

export interface PrescriptionVisitRecord {
  id: string;
  visitDate: Date;
  status: string;
  patient: { id: string; patientCode: string; fullName: string };
}

export interface PrescriptionMedicineRecord {
  id: string;
  name: string;
  unit: string;
  status: string;
}

export interface IPrescriptionsRepository {
  findByIdForEmployee(id: string, employeeId: string): Promise<PrescriptionRecord | null>;
  findManyForEmployee(employeeId: string, search?: string): Promise<PrescriptionRecord[]>;
  findAssignedVisits(employeeId: string, search?: string): Promise<PrescriptionVisitRecord[]>;
  findActiveMedicines(search?: string): Promise<PrescriptionMedicineRecord[]>;
  createForAssignedVisit(employeeId: string, visitId: string, items: PrescriptionItemInput[]): Promise<string>;
  replaceOwnDraftItems(id: string, employeeId: string, items: PrescriptionItemInput[]): Promise<void>;
}
