export interface AllergyItem {
  id?: string;
  substance: string;
  reaction?: string | null;
  severity?: string | null;
}

export interface MedicalHistoryItem {
  id?: string;
  type: string;
  content: string;
}

export interface PatientVisitSummary {
  id: string;
  visitDate: string;
  status: string;
  roomId?: string | null;
  employeeId?: string | null;
}

export interface PatientItem {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  allergies: AllergyItem[];
  histories: MedicalHistoryItem[];
  visitsCount: number;
  lastVisitDate?: string | null;
}

export interface PatientDetail {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  allergies: AllergyItem[];
  histories: MedicalHistoryItem[];
  visits: PatientVisitSummary[];
}

export interface CreatePatientDto {
  fullName: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  allergies?: AllergyItem[];
  histories?: MedicalHistoryItem[];
}

export interface UpdatePatientDto {
  fullName?: string;
  dateOfBirth?: string | null;
  phone?: string | null;
  allergies?: AllergyItem[];
  histories?: MedicalHistoryItem[];
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matches: Array<{
    id: string;
    patientCode: string;
    fullName: string;
    phone?: string | null;
    dateOfBirth?: string | null;
  }>;
  reasons: string[];
}

export interface PatientListQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PatientListResponse {
  items: PatientItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReceptionStats {
  totalPatients: number;
  todayPatients: number;
  patientsWithAllergy: number;
}
