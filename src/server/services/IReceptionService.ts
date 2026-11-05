export interface IReceptionService {
  getById(id: string): Promise<unknown | null>;
  getList(): Promise<unknown[]>;
  getAppointmentsByDate(dateStr: string): Promise<any[]>;
  createVisit(patientId: string, employeeId?: string, roomId?: string): Promise<any>;

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
