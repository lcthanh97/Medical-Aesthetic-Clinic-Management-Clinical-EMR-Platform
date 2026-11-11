import type {
  IEmrRepository,
  EmrActorScope,
  MedicalRecordSnapshot,
  EmrRelatedReadScope,
  TreatmentImageFilters,
} from '@/server/repositories/IEmrRepository';
import type { IEmrService } from './IEmrService';

export class EmrService implements IEmrService {
  constructor(private readonly repository: IEmrRepository) {}

  async getById(id: string, employeeId: string) {
    this.requireId(id, 'Thiếu mã bệnh nhân.');
    this.requireId(employeeId, 'Employee is required.');
    return this.repository.findByIdForEmployee(id, employeeId);
  }

  async getList(employeeId: string, search?: string) {
    this.requireId(employeeId, 'Employee is required.');
    return this.repository.findManyForEmployee(employeeId, search);
  }

  async getPatientFullEMR(patientId: string, employeeId: string, scope: EmrRelatedReadScope = { prescriptions: false, treatmentPlans: false, clinicalOrders: false }) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    this.requireId(employeeId, 'Employee is required.');
    return this.repository.getPatientFullEMRForEmployee(patientId, employeeId, scope);
  }

  async getAssignedVisit(
    visitId: string,
    actor: EmrActorScope,
    scope: EmrRelatedReadScope = { prescriptions: false, treatmentPlans: false, clinicalOrders: false },
    allowedRoleNames: string[] = [],
  ) {
    this.requireId(visitId, 'Thiếu mã lượt khám.');
    this.requireImageActor(actor);
    if (!allowedRoleNames.length) throw new Error('An approved EMR read role is required.');
    return this.repository.getAssignedVisitForEmployee(visitId, actor, scope, allowedRoleNames);
  }

  async getTreatmentImageTimeline(
    patientId: string,
    actor: { accountId: string; employeeId: string; sessionId: string },
    filters: TreatmentImageFilters = {},
  ) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    this.requireImageActor(actor);
    return this.repository.getTreatmentImageTimelineForEmployee(patientId, actor, filters);
  }

  async getTreatmentImageDetails(
    patientId: string,
    imageId: string,
    actor: { accountId: string; employeeId: string; sessionId: string },
  ) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    this.requireId(imageId, 'Thiếu mã hình ảnh.');
    this.requireImageActor(actor);
    return this.repository.getTreatmentImageDetailsForEmployee(patientId, imageId, actor);
  }

  async compareTreatmentImages(
    patientId: string,
    imageIds: [string, string],
    actor: { accountId: string; employeeId: string; sessionId: string },
  ) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    this.requireImageActor(actor);
    if (!Array.isArray(imageIds) || imageIds.length !== 2 || imageIds.some((id) => typeof id !== 'string' || !id.trim()) || imageIds[0] === imageIds[1]) {
      throw new Error('Cần chọn hai hình ảnh khác nhau.');
    }
    return this.repository.getTreatmentImagesForComparison(patientId, imageIds, actor);
  }

  private requireImageActor(actor: { accountId: string; employeeId: string; sessionId: string } | null | undefined): asserts actor is { accountId: string; employeeId: string; sessionId: string } {
    this.requireId(actor?.accountId, 'Account is required.');
    this.requireId(actor?.employeeId, 'Employee is required.');
    this.requireId(actor?.sessionId, 'Session is required.');
  }

  async createPatient(input: { fullName: string; phone?: string; dateOfBirth?: string; patientCode?: string }) {
    if (!input.fullName?.trim()) {
      throw new Error('Họ và tên bệnh nhân không được để trống.');
    }
    return this.repository.create(input);
  }

  async updatePatient(id: string, input: { fullName?: string; phone?: string; dateOfBirth?: string }) {
    this.requireId(id, 'Thiếu mã bệnh nhân.');
    this.requireOptionalText(input?.fullName, 'Họ và tên bệnh nhân phải là chuỗi.');
    if (input.fullName !== undefined && !input.fullName.trim()) {
      throw new Error('Họ và tên bệnh nhân không được để trống.');
    }
    return this.repository.update(id, input);
  }

  async saveMedicalRecord(
    visitId: string,
    actor: { accountId: string; employeeId: string; sessionId: string },
    allowedRoleNames: string[],
    input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string },
    expected: MedicalRecordSnapshot | null
  ) {
    this.requireId(visitId, 'Thiếu mã lượt khám (visitId).');
    this.requireId(actor?.accountId, 'Account is required.');
    this.requireId(actor?.employeeId, 'Employee is required.');
    this.requireId(actor?.sessionId, 'Session is required.');
    if (!allowedRoleNames.length) throw new Error('An approved EMR write role is required.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Dữ liệu bệnh án không hợp lệ.');
    }
    this.requireOptionalText(input.preliminaryDiagnosis, 'Chẩn đoán sơ bộ phải là chuỗi.');
    this.requireOptionalText(input.finalDiagnosis, 'Chẩn đoán cuối cùng phải là chuỗi.');
    this.requireOptionalText(input.notes, 'Ghi chú phải là chuỗi.');
    if (expected !== null && (!expected || typeof expected !== 'object' || Array.isArray(expected))) {
      throw new Error('Phiên bản bệnh án cần đối chiếu không hợp lệ.');
    }
    if (expected) {
      this.requireSnapshotText(expected.preliminaryDiagnosis, 'Chẩn đoán sơ bộ cũ không hợp lệ.');
      this.requireSnapshotText(expected.finalDiagnosis, 'Chẩn đoán cuối cùng cũ không hợp lệ.');
      this.requireSnapshotText(expected.notes, 'Ghi chú cũ không hợp lệ.');
    }
    return this.repository.saveMedicalRecord(visitId, actor, allowedRoleNames, input, expected);
  }

  async addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Dữ liệu dị ứng không hợp lệ.');
    }
    if (!input.substance?.trim()) {
      throw new Error('Vui lòng nhập tác nhân dị ứng.');
    }
    this.requireOptionalText(input.severity, 'Mức độ dị ứng phải là chuỗi.');
    this.requireOptionalText(input.reaction, 'Phản ứng dị ứng phải là chuỗi.');
    return this.repository.addPatientAllergy(patientId, input);
  }

  async addPatientHistory(patientId: string, input: { type: string; content: string }) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Dữ liệu tiền sử bệnh không hợp lệ.');
    }
    if (!input.type?.trim()) {
      throw new Error('Thiếu loại tiền sử bệnh.');
    }
    if (!input.content?.trim()) {
      throw new Error('Vui lòng nhập nội dung tiền sử bệnh.');
    }
    return this.repository.addPatientHistory(patientId, input);
  }

  async createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }) {
    this.requireId(patientId, 'Thiếu mã bệnh nhân.');
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error('Dữ liệu lượt khám không hợp lệ.');
    }
    this.requireOptionalText(input.preliminaryDiagnosis, 'Chẩn đoán sơ bộ phải là chuỗi.');
    this.requireOptionalText(input.finalDiagnosis, 'Chẩn đoán cuối cùng phải là chuỗi.');
    this.requireOptionalText(input.notes, 'Ghi chú phải là chuỗi.');
    this.requireOptionalText(input.employeeId, 'Mã nhân viên phải là chuỗi.');
    this.requireOptionalText(input.roomId, 'Mã phòng phải là chuỗi.');
    return this.repository.createQuickVisit(patientId, input);
  }

  private requireId(value: unknown, message: string): asserts value is string {
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(message);
    }
  }

  private requireOptionalText(value: unknown, message: string): void {
    if (value !== undefined && typeof value !== 'string') {
      throw new Error(message);
    }
  }

  private requireSnapshotText(value: unknown, message: string): asserts value is string | null {
    if (value !== null && typeof value !== 'string') {
      throw new Error(message);
    }
  }
}
