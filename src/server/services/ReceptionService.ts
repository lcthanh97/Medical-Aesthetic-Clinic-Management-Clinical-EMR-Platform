import type { IReceptionRepository } from '@/server/repositories/IReceptionRepository';
import type { IReceptionService } from './IReceptionService';
import { ReceptionMapper } from '@/server/mappers/ReceptionMapper';
import { DomainError } from '@/domain/errors/DomainError';
import type {
  CreatePatientDto,
  UpdatePatientDto,
  PatientListQuery,
  PatientListResponse,
  DuplicateCheckResult,
  ReceptionStats,
  PatientDetail,
  PatientVisitSummary,
} from '@/features/reception/types/reception.types';

export class ReceptionService implements IReceptionService {
  constructor(private readonly repository: IReceptionRepository) {}

  async getById(id: string): Promise<PatientDetail> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new DomainError(`Không tìm thấy hồ sơ bệnh nhân với mã định danh: ${id}`, 'PATIENT_NOT_FOUND');
    }
    return ReceptionMapper.toPatientDetail(record);
  }

  async getList(query?: PatientListQuery): Promise<PatientListResponse> {
    const page = query?.page && query.page > 0 ? Number(query.page) : 1;
    const limit = query?.limit && query.limit > 0 ? Number(query.limit) : 10;

    const { items, total } = await this.repository.findMany({
      search: query?.search,
      page,
      limit,
    });

    const mappedItems = items.map((item) => ReceptionMapper.toPatientItem(item));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: mappedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async create(dto: CreatePatientDto, accountId?: string): Promise<PatientDetail> {
    // Generate Unique Patient Code: BN-YYYYMM-XXXX
    const count = await this.repository.countPatients();
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sequence = String(count + 1).padStart(4, '0');
    let patientCode = `BN${yearMonth}-${sequence}`;

    // Verify uniqueness
    let existing = await this.repository.findByPatientCode(patientCode);
    if (existing) {
      patientCode = `BN${yearMonth}-${String(count + Math.floor(Math.random() * 900) + 100)}`;
    }

    const dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;

    const record = await this.repository.create({
      patientCode,
      fullName: dto.fullName.trim(),
      dateOfBirth,
      phone: dto.phone?.trim() ?? null,
      allergies: dto.allergies?.map((a) => ({
        substance: a.substance.trim(),
        reaction: a.reaction?.trim() ?? null,
        severity: a.severity?.trim() ?? null,
      })),
      histories: dto.histories?.map((h) => ({
        type: h.type.trim(),
        content: h.content.trim(),
      })),
    });

    // Mandatory Audit Logging
    await this.repository.createAudit({
      action: 'CREATE_PATIENT',
      entity: 'Patient',
      entityId: record.id,
      accountId,
    });

    return ReceptionMapper.toPatientDetail(record);
  }

  async update(id: string, dto: UpdatePatientDto, accountId?: string): Promise<PatientDetail> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new DomainError(`Không tìm thấy hồ sơ bệnh nhân để cập nhật: ${id}`, 'PATIENT_NOT_FOUND');
    }

    const dateOfBirth = dto.dateOfBirth !== undefined
      ? (dto.dateOfBirth ? new Date(dto.dateOfBirth) : null)
      : undefined;

    const updated = await this.repository.update(id, {
      fullName: dto.fullName?.trim(),
      dateOfBirth,
      phone: dto.phone !== undefined ? (dto.phone?.trim() ?? null) : undefined,
      allergies: dto.allergies?.map((a) => ({
        substance: a.substance.trim(),
        reaction: a.reaction?.trim() ?? null,
        severity: a.severity?.trim() ?? null,
      })),
      histories: dto.histories?.map((h) => ({
        type: h.type.trim(),
        content: h.content.trim(),
      })),
    });

    // Mandatory Audit Logging
    await this.repository.createAudit({
      action: 'UPDATE_PATIENT',
      entity: 'Patient',
      entityId: id,
      accountId,
    });

    return ReceptionMapper.toPatientDetail(updated);
  }

  async checkDuplicate(query: { phone?: string; fullName?: string; dateOfBirth?: string }): Promise<DuplicateCheckResult> {
    const dateOfBirth = query.dateOfBirth ? new Date(query.dateOfBirth) : null;
    const matches = await this.repository.findDuplicates({
      phone: query.phone?.trim(),
      fullName: query.fullName?.trim(),
      dateOfBirth,
    });

    const reasons: string[] = [];
    if (matches.length > 0) {
      matches.forEach((m) => {
        if (query.phone && m.phone === query.phone.trim()) {
          reasons.push(`Trùng số điện thoại (${query.phone}) với bệnh nhân ${m.fullName} (${m.patientCode})`);
        }
        if (query.fullName && m.fullName.toLowerCase() === query.fullName.trim().toLowerCase()) {
          reasons.push(`Trùng họ tên và ngày sinh với bệnh nhân ${m.fullName} (${m.patientCode})`);
        }
      });
    }

    return {
      isDuplicate: matches.length > 0,
      matches: matches.map((m) => ({
        id: m.id,
        patientCode: m.patientCode,
        fullName: m.fullName,
        phone: m.phone,
        dateOfBirth: m.dateOfBirth ? new Date(m.dateOfBirth).toISOString() : null,
      })),
      reasons,
    };
  }

  async getStats(): Promise<ReceptionStats> {
    return this.repository.getStats();
  }

  async getPatientVisits(patientId: string): Promise<PatientVisitSummary[]> {
    const patient = await this.repository.findById(patientId);
    if (!patient) {
      throw new DomainError(`Không tìm thấy hồ sơ bệnh nhân: ${patientId}`, 'PATIENT_NOT_FOUND');
    }
    return (patient.visits || []).map((v: any) => ({
      id: v.id,
      visitDate: new Date(v.visitDate).toISOString(),
      status: v.status,
      roomId: v.roomId,
      employeeId: v.employeeId,
    }));
  }
}
