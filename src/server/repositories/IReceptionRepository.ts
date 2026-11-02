import type { Patient } from '@/domain/entities/Patient';

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
  allergies?: Array<{
    substance: string;
    reaction?: string | null;
    severity?: string | null;
  }>;
  histories?: Array<{
    type: string;
    content: string;
  }>;
}

export interface PatientUpdateInput {
  fullName?: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  allergies?: Array<{
    substance: string;
    reaction?: string | null;
    severity?: string | null;
  }>;
  histories?: Array<{
    type: string;
    content: string;
  }>;
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
}
