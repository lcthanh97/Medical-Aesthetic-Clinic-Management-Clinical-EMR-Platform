import type { IReceptionRepository } from '@/server/repositories/IReceptionRepository';
import type { IReceptionService } from './IReceptionService';

export class ReceptionService implements IReceptionService {
  constructor(private readonly repository: IReceptionRepository) {}

  getById(id: string) { return this.repository.findById(id); }
  getList() { return this.repository.findMany(); }

  getAppointmentsByDate(dateStr: string) { return this.repository.getAppointmentsByDate(dateStr); }
  createVisit(patientId: string, employeeId?: string, roomId?: string) { return this.repository.createVisit(patientId, employeeId, roomId); }

  // Allergies
  getAllergiesByPatientId(patientId: string) {
    return this.repository.getAllergiesByPatientId(patientId);
  }

  createAllergy(patientId: string, input: any) {
    return this.repository.createAllergy(patientId, input);
  }

  updateAllergy(id: string, input: any) {
    return this.repository.updateAllergy(id, input);
  }

  deleteAllergy(id: string) {
    return this.repository.deleteAllergy(id);
  }

  // Medical History
  getMedicalHistoriesByPatientId(patientId: string) {
    return this.repository.getMedicalHistoriesByPatientId(patientId);
  }

  createMedicalHistory(patientId: string, input: any) {
    return this.repository.createMedicalHistory(patientId, input);
  }

  updateMedicalHistory(id: string, input: any) {
    return this.repository.updateMedicalHistory(id, input);
  }

  deleteMedicalHistory(id: string) {
    return this.repository.deleteMedicalHistory(id);
  }
}
