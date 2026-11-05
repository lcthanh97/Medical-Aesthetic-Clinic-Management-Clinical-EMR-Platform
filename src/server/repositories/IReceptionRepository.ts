export interface IReceptionRepository {
  findById(id: string): Promise<unknown | null>;
  findMany(): Promise<unknown[]>;
  getAppointmentsByDate(dateStr: string): Promise<any[]>;
  createVisit(patientId: string, employeeId?: string, roomId?: string): Promise<any>;
  create(input: unknown): Promise<unknown>;
  update(id: string, input: unknown): Promise<unknown>;

  // Allergies
  getAllergiesByPatientId(patientId: string): Promise<any[]>;
  createAllergy(patientId: string, input: any): Promise<any>;
  updateAllergy(id: string, input: any): Promise<any>;
  deleteAllergy(id: string): Promise<boolean>;

  // Medical History
  getMedicalHistoriesByPatientId(patientId: string): Promise<any[]>;
  createMedicalHistory(patientId: string, input: any): Promise<any>;
  updateMedicalHistory(id: string, input: any): Promise<any>;
  deleteMedicalHistory(id: string): Promise<boolean>;
}
