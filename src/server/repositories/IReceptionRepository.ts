export interface PatientListFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PatientCreateInput {
  patientCode: string;
  fullName: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  allergies?: Array<{ substance: string; reaction?: string | null; severity?: string | null }>;
  histories?: Array<{ type: string; content: string }>;
}

export interface PatientUpdateInput {
  fullName?: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  allergies?: Array<{ substance: string; reaction?: string | null; severity?: string | null }>;
  histories?: Array<{ type: string; content: string }>;
}

export interface DuplicateCheckQuery {
  phone?: string;
  fullName?: string;
  dateOfBirth?: Date | null;
}

export interface IReceptionRepository {
  findById(id: string): Promise<any | null>;
  findByPatientCode(patientCode: string): Promise<any | null>;
  findMany(params?: PatientListFilter): Promise<{ items: any[]; total: number }>;
  create(input: PatientCreateInput): Promise<any>;
  update(id: string, input: PatientUpdateInput): Promise<any>;
  findDuplicates(query: DuplicateCheckQuery): Promise<any[]>;
  getStats(): Promise<{ totalPatients: number; todayPatients: number; patientsWithAllergy: number }>;
  countPatients(): Promise<number>;
  createAudit(data: { action: string; entity: string; entityId: string; accountId?: string }): Promise<void>;

  getAppointmentsByDate?(dateStr: string): Promise<any[]>;
  createVisit?(patientId: string, employeeId?: string, roomId?: string): Promise<any>;
  getAllergiesByPatientId?(patientId: string): Promise<any[]>;
  createAllergy?(patientId: string, input: any): Promise<any>;
  updateAllergy?(id: string, input: any): Promise<any>;
  deleteAllergy?(id: string): Promise<boolean>;
  getMedicalHistoriesByPatientId?(patientId: string): Promise<any[]>;
  createMedicalHistory?(patientId: string, input: any): Promise<any>;
  updateMedicalHistory?(id: string, input: any): Promise<any>;
  deleteMedicalHistory?(id: string): Promise<boolean>;
}
