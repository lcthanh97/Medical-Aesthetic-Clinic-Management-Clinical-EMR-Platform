export type MedicalRecordSnapshot = {
  preliminaryDiagnosis: string | null;
  finalDiagnosis: string | null;
  notes: string | null;
};

export type EmrActorScope = { accountId: string; employeeId: string; sessionId: string };
export type EmrRelatedReadScope = {
  prescriptions: boolean;
  treatmentPlans: boolean;
  clinicalOrders: boolean;
};

export type TreatmentImageFilters = {
  visitId?: string;
  planId?: string;
  sessionId?: string;
  phase?: string;
  imageType?: string;
  bodyArea?: string;
  from?: string;
  to?: string;
};

export type TreatmentImageTimelineItem = {
  id: string;
  planId: string;
  sessionId: string | null;
  visitId: string;
  imageType: string;
  phase: string;
  bodyArea: string | null;
  description: string | null;
  capturedAt: Date;
  createdAt: Date;
  plan: { id: string; name: string };
  session: { id: string; sessionNo: number; treatmentArea: string | null } | null;
};

export interface IEmrRepository {
  findByIdForEmployee(id: string, employeeId: string): Promise<any | null>;
  findManyForEmployee(employeeId: string, search?: string): Promise<any[]>;
  create(input: any): Promise<any>;
  update(id: string, input: any): Promise<any>;
  getPatientFullEMRForEmployee(patientId: string, employeeId: string, scope?: EmrRelatedReadScope): Promise<any | null>;
  getAssignedVisitForEmployee(visitId: string, actor: EmrActorScope, scope?: EmrRelatedReadScope): Promise<any | null>;
  getTreatmentImageTimelineForEmployee(
    patientId: string,
    actor: EmrActorScope,
    filters?: TreatmentImageFilters
  ): Promise<TreatmentImageTimelineItem[]>;
  getTreatmentImageDetailsForEmployee(
    patientId: string,
    imageId: string,
    actor: EmrActorScope
  ): Promise<TreatmentImageTimelineItem | null>;
  getTreatmentImagesForComparison(
    patientId: string,
    imageIds: [string, string],
    actor: EmrActorScope
  ): Promise<[TreatmentImageTimelineItem, TreatmentImageTimelineItem] | null>;
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
