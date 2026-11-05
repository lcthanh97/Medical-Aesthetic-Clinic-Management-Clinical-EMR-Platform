import type {
  EmrActorScope,
  MedicalRecordSnapshot,
  EmrRelatedReadScope,
  TreatmentImageFilters,
  TreatmentImageTimelineItem,
} from '@/server/repositories/IEmrRepository';

export interface IEmrService {
  getById(id: string, employeeId: string): Promise<any | null>;
  getList(employeeId: string, search?: string): Promise<any[]>;
  getPatientFullEMR(patientId: string, employeeId: string, scope?: EmrRelatedReadScope): Promise<any | null>;
  getAssignedVisit(visitId: string, actor: EmrActorScope, scope?: EmrRelatedReadScope): Promise<any | null>;
  getTreatmentImageTimeline(
    patientId: string,
    actor: EmrActorScope,
    filters?: TreatmentImageFilters
  ): Promise<TreatmentImageTimelineItem[]>;
  getTreatmentImageDetails(
    patientId: string,
    imageId: string,
    actor: EmrActorScope
  ): Promise<TreatmentImageTimelineItem | null>;
  compareTreatmentImages(
    patientId: string,
    imageIds: [string, string],
    actor: EmrActorScope
  ): Promise<[TreatmentImageTimelineItem, TreatmentImageTimelineItem] | null>;
  createPatient(input: { fullName: string; phone?: string; dateOfBirth?: string; patientCode?: string }): Promise<any>;
  updatePatient(id: string, input: { fullName?: string; phone?: string; dateOfBirth?: string }): Promise<any>;
  saveMedicalRecord(
    visitId: string,
    actor: EmrActorScope,
    allowedRoleNames: string[],
    input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
    expected: MedicalRecordSnapshot | null
  ): Promise<any>;
  addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }): Promise<any>;
  addPatientHistory(patientId: string, input: { type: string; content: string }): Promise<any>;
  createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }): Promise<any>;
}
