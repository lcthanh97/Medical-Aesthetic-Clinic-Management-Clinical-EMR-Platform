import type {
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

  getAppointmentsByDate(dateStr: string): Promise<any[]>;
  createVisit(patientId: string, employeeId?: string, roomId?: string): Promise<any>;
  getAllergiesByPatientId(patientId: string): Promise<any[]>;
  createAllergy(patientId: string, input: any): Promise<any>;
  updateAllergy(id: string, input: any): Promise<any>;
  deleteAllergy(id: string): Promise<boolean>;
  getMedicalHistoriesByPatientId(patientId: string): Promise<any[]>;
  createMedicalHistory(patientId: string, input: any): Promise<any>;
  updateMedicalHistory(id: string, input: any): Promise<any>;
  deleteMedicalHistory(id: string): Promise<boolean>;
}
