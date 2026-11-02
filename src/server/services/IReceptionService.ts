import type {
  PatientItem,
  PatientDetail,
  CreatePatientDto,
  UpdatePatientDto,
  DuplicateCheckResult,
  PatientListQuery,
  PatientListResponse,
  ReceptionStats,
  PatientVisitSummary,
} from '@/features/reception/types/reception.types';

export interface IReceptionService {
  getById(id: string): Promise<PatientDetail>;
  getList(query?: PatientListQuery): Promise<PatientListResponse>;
  create(dto: CreatePatientDto, accountId?: string): Promise<PatientDetail>;
  update(id: string, dto: UpdatePatientDto, accountId?: string): Promise<PatientDetail>;
  checkDuplicate(query: { phone?: string; fullName?: string; dateOfBirth?: string }): Promise<DuplicateCheckResult>;
  getStats(): Promise<ReceptionStats>;
  getPatientVisits(patientId: string): Promise<PatientVisitSummary[]>;
}
