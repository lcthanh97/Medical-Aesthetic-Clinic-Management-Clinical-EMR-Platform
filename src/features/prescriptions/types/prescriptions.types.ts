export interface PrescriptionMedicineView {
  id: string;
  name: string;
  unit: string;
  status: string;
}

export interface PrescriptionVisitView {
  id: string;
  visitDate: string;
  status: string;
  patient: { id: string; patientCode: string; fullName: string };
}

export interface PrescriptionItemView {
  id: string;
  medicineId: string;
  medicine: PrescriptionMedicineView;
  quantity: string;
  dosage: string;
}

export interface PrescriptionView {
  id: string;
  status: string;
  employeeName: string;
  visit: PrescriptionVisitView;
  items: PrescriptionItemView[];
  canEdit: boolean;
}

export interface PrescriptionListView {
  prescriptions: PrescriptionView[];
  canWrite: boolean;
}

export type PrescriptionsViewModel = PrescriptionView;
