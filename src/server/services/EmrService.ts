import type { IEmrRepository } from '@/server/repositories/IEmrRepository';
import type { IEmrService } from './IEmrService';

export class EmrService implements IEmrService {
  constructor(private readonly repository: IEmrRepository) {}

  async getById(id: string) {
    return this.repository.findById(id);
  }

  async getList(search?: string) {
    return this.repository.findMany(search);
  }

  async getPatientFullEMR(patientId: string) {
    return this.repository.getPatientFullEMR(patientId);
  }

  async createPatient(input: { fullName: string; phone?: string; dateOfBirth?: string; patientCode?: string }) {
    if (!input.fullName?.trim()) {
      throw new Error('Họ và tên bệnh nhân không được để trống.');
    }
    return this.repository.create(input);
  }

  async updatePatient(id: string, input: { fullName?: string; phone?: string; dateOfBirth?: string }) {
    return this.repository.update(id, input);
  }

  async saveMedicalRecord(visitId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string }) {
    if (!visitId) {
      throw new Error('Thiếu mã lượt khám (visitId).');
    }
    return this.repository.saveMedicalRecord(visitId, input);
  }

  async addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }) {
    if (!input.substance?.trim()) {
      throw new Error('Vui lòng nhập tác nhân dị ứng.');
    }
    return this.repository.addPatientAllergy(patientId, input);
  }

  async addPatientHistory(patientId: string, input: { type: string; content: string }) {
    if (!input.content?.trim()) {
      throw new Error('Vui lòng nhập nội dung tiền sử bệnh.');
    }
    return this.repository.addPatientHistory(patientId, input);
  }

  async createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }) {
    if (!patientId) {
      throw new Error('Thiếu mã bệnh nhân.');
    }
    return this.repository.createQuickVisit(patientId, input);
  }
}
