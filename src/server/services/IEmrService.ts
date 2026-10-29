export interface IEmrService {
  getById(id: string): Promise<any | null>;
  getList(search?: string): Promise<any[]>;
  getPatientFullEMR(patientId: string): Promise<any | null>;
  createPatient(input: { fullName: string; phone?: string; dateOfBirth?: string; patientCode?: string }): Promise<any>;
  updatePatient(id: string, input: { fullName?: string; phone?: string; dateOfBirth?: string }): Promise<any>;
  saveMedicalRecord(visitId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string }): Promise<any>;
  addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }): Promise<any>;
  addPatientHistory(patientId: string, input: { type: string; content: string }): Promise<any>;
  createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }): Promise<any>;
}
