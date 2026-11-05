import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReceptionService } from '../../../src/server/services/ReceptionService';
import type { IReceptionRepository } from '../../../src/server/repositories/IReceptionRepository';
import { DomainError } from '../../../src/domain/errors/DomainError';

describe('ReceptionService Unit Tests', () => {
  let mockRepository: IReceptionRepository;
  let service: ReceptionService;

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      findByPatientCode: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findDuplicates: vi.fn(),
      getStats: vi.fn(),
      countPatients: vi.fn(),
      createAudit: vi.fn(),
    };
    service = new ReceptionService(mockRepository);
  });

  it('nên tạo bệnh nhân mới thành công và sinh mã patientCode tự động', async () => {
    vi.mocked(mockRepository.countPatients).mockResolvedValue(5);
    vi.mocked(mockRepository.findByPatientCode).mockResolvedValue(null);
    vi.mocked(mockRepository.create).mockImplementation(async (input) => ({
      id: 'patient-123',
      patientCode: input.patientCode,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
      allergies: input.allergies?.map((a, i) => ({ id: `all-${i}`, ...a })) ?? [],
      histories: input.histories?.map((h, i) => ({ id: `his-${i}`, ...h })) ?? [],
      visits: [],
    }));

    const result = await service.create({
      fullName: 'Nguyễn Thị Lan Anh',
      dateOfBirth: '1996-04-24T00:00:00.000Z',
      phone: '0901234567',
      allergies: [
        { substance: 'Penicillin', reaction: 'Mẩn ngứa', severity: 'Trung bình' },
      ],
      histories: [
        { type: 'Tiền sử bệnh lý bản thân', content: 'Viêm da cơ địa 2 năm' },
      ],
    });

    expect(result.id).toBe('patient-123');
    expect(result.patientCode).toMatch(/^BN\d{6}-\d{4}$/);
    expect(result.fullName).toBe('Nguyễn Thị Lan Anh');
    expect(result.allergies).toHaveLength(1);
    expect(result.allergies[0].substance).toBe('Penicillin');
    expect(result.histories).toHaveLength(1);
    expect(mockRepository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE_PATIENT',
        entity: 'Patient',
        entityId: 'patient-123',
      })
    );
  });

  it('nên ném DomainError với code PATIENT_NOT_FOUND khi không tìm thấy hồ sơ', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue(null);

    await expect(service.getById('non-existent-id')).rejects.toThrow(DomainError);
    await expect(service.getById('non-existent-id')).rejects.toMatchObject({
      code: 'PATIENT_NOT_FOUND',
    });
  });

  it('nên lấy danh sách bệnh nhân và phân trang chính xác', async () => {
    vi.mocked(mockRepository.findMany).mockResolvedValue({
      items: [
        {
          id: 'p-1',
          patientCode: 'BN001',
          fullName: 'Trần Văn A',
          dateOfBirth: new Date('1990-01-01'),
          phone: '0911111111',
          allergies: [],
          histories: [],
          visits: [],
          _count: { visits: 2 },
        },
      ],
      total: 1,
    });

    const res = await service.getList({ search: 'Trần', page: 1, limit: 10 });
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].fullName).toBe('Trần Văn A');
    expect(res.items[0].visitsCount).toBe(2);
    expect(mockRepository.findMany).toHaveBeenCalledWith({
      search: 'Trần',
      page: 1,
      limit: 10,
    });
  });

  it('nên phát hiện trùng lặp theo số điện thoại', async () => {
    vi.mocked(mockRepository.findDuplicates).mockResolvedValue([
      {
        id: 'dup-1',
        patientCode: 'BN999',
        fullName: 'Nguyễn Văn B',
        phone: '0988888888',
        dateOfBirth: new Date('1992-05-10'),
      },
    ]);

    const res = await service.checkDuplicate({ phone: '0988888888' });
    expect(res.isDuplicate).toBe(true);
    expect(res.matches).toHaveLength(1);
    expect(res.reasons[0]).toContain('Trùng số điện thoại (0988888888)');
  });

  it('nên cập nhật hồ sơ bệnh nhân thành công', async () => {
    vi.mocked(mockRepository.findById).mockResolvedValue({
      id: 'p-update',
      patientCode: 'BN002',
      fullName: 'Lê Thị C',
    });

    vi.mocked(mockRepository.update).mockResolvedValue({
      id: 'p-update',
      patientCode: 'BN002',
      fullName: 'Lê Thị C (Đã cập nhật)',
      phone: '0933333333',
      allergies: [],
      histories: [],
      visits: [],
    });

    const res = await service.update('p-update', {
      fullName: 'Lê Thị C (Đã cập nhật)',
      phone: '0933333333',
    });

    expect(res.fullName).toBe('Lê Thị C (Đã cập nhật)');
    expect(mockRepository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE_PATIENT',
        entityId: 'p-update',
      })
    );
  });
});
