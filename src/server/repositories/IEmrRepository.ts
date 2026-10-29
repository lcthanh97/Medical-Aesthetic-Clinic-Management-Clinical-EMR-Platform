export interface IEmrRepository {
  findById(id: string): Promise<any | null>;
  findMany(search?: string): Promise<any[]>;
  create(input: any): Promise<any>;
  update(id: string, input: any): Promise<any>;
  getPatientFullEMR(patientId: string): Promise<any | null>;
  saveMedicalRecord(visitId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string }): Promise<any>;
  addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }): Promise<any>;
  addPatientHistory(patientId: string, input: { type: string; content: string }): Promise<any>;
  createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }): Promise<any>;
}
