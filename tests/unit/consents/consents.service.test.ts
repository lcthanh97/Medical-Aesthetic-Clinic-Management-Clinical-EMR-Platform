import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsentsService } from '../../../src/server/services/ConsentsService';
import type { IConsentsRepository } from '../../../src/server/repositories/IConsentsRepository';

describe('CON-01 & CON-02: ConsentsService Strict Unit Tests (No Audit Scope)', () => {
  let mockRepo: IConsentsRepository;
  let service: ConsentsService;

  beforeEach(() => {
    mockRepo = {
      createTemplate: vi.fn(),
      updateTemplate: vi.fn(),
      findTemplateById: vi.fn(),
      findTemplatesByName: vi.fn(),
      findAllTemplates: vi.fn(),
      getHighestVersionForTemplate: vi.fn(),
      countSignedConsentsByTemplateId: vi.fn(),
      createSignedConsent: vi.fn(),
      findSignedConsentById: vi.fn(),
      findSignedConsentsByVisitId: vi.fn(),
      findAllSignedConsents: vi.fn(),
      findById: vi.fn(),
      findMany: vi.fn(),
    };

    service = new ConsentsService(mockRepo);
  });

  describe('CON-01: Biểu mẫu cam kết & Quản lý phiên bản', () => {
    it('1. Tạo mới biểu mẫu cam kết thành công (khởi đầu với phiên bản v1)', async () => {
      vi.mocked(mockRepo.createTemplate).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết làm thủ thuật Laser CO2',
        version: 1,
        content: 'Nội dung cam kết thủ thuật Laser...',
        _count: { signedConsents: 0 },
      });

      const result = await service.createTemplate({
        name: 'Cam kết làm thủ thuật Laser CO2',
        content: 'Nội dung cam kết thủ thuật Laser...',
      });

      expect(result.id).toBe('tpl-1');
      expect(result.version).toBe(1);
      expect(mockRepo.createTemplate).toHaveBeenCalledWith({
        name: 'Cam kết làm thủ thuật Laser CO2',
        version: 1,
        content: 'Nội dung cam kết thủ thuật Laser...',
      });
    });

    it('2. Cho phép chỉnh sửa nội dung biểu mẫu khi chưa có ai ký (signedCount = 0)', async () => {
      vi.mocked(mockRepo.findTemplateById).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết phẫu thuật u da',
        version: 1,
        content: 'Nội dung ban đầu',
      });
      vi.mocked(mockRepo.countSignedConsentsByTemplateId).mockResolvedValue(0); // Chưa có ai ký
      vi.mocked(mockRepo.updateTemplate).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết phẫu thuật u da',
        version: 1,
        content: 'Nội dung đã chỉnh sửa hoàn thiện',
        _count: { signedConsents: 0 },
      });

      const result = await service.updateTemplate('tpl-1', {
        content: 'Nội dung đã chỉnh sửa hoàn thiện',
      });

      expect(result.content).toBe('Nội dung đã chỉnh sửa hoàn thiện');
      expect(mockRepo.updateTemplate).toHaveBeenCalledWith('tpl-1', {
        name: 'Cam kết phẫu thuật u da',
        content: 'Nội dung đã chỉnh sửa hoàn thiện',
      });
    });

    it('3. Chặn chỉnh sửa trực tiếp khi biểu mẫu đã có bản ký (yêu cầu tạo phiên bản mới)', async () => {
      vi.mocked(mockRepo.findTemplateById).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết phẫu thuật u da',
        version: 1,
        content: 'Nội dung ban đầu',
      });
      vi.mocked(mockRepo.countSignedConsentsByTemplateId).mockResolvedValue(3); // Đã có 3 người ký!

      await expect(
        service.updateTemplate('tpl-1', {
          content: 'Cố tình sửa đè nội dung',
        })
      ).rejects.toMatchObject({ code: 'TEMPLATE_ALREADY_USED' });

      expect(mockRepo.updateTemplate).not.toHaveBeenCalled();
    });

    it('4. Nâng phiên bản mới cho biểu mẫu (v1 -> v2) phục vụ việc lựa chọn sử dụng', async () => {
      vi.mocked(mockRepo.findTemplateById).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết Laser CO2',
        version: 1,
        content: 'Nội dung cũ v1',
      });
      vi.mocked(mockRepo.getHighestVersionForTemplate).mockResolvedValue(1);
      vi.mocked(mockRepo.createTemplate).mockResolvedValue({
        id: 'tpl-2',
        name: 'Cam kết Laser CO2',
        version: 2,
        content: 'Nội dung mới cập nhật v2',
        _count: { signedConsents: 0 },
      });

      const result = await service.createTemplateVersion('tpl-1', {
        content: 'Nội dung mới cập nhật v2',
      });

      expect(result.id).toBe('tpl-2');
      expect(result.version).toBe(2);
      expect(mockRepo.createTemplate).toHaveBeenCalledWith({
        name: 'Cam kết Laser CO2',
        version: 2,
        content: 'Nội dung mới cập nhật v2',
      });
    });
  });

  describe('CON-02: Ký cam kết trên thiết bị (Signature Pad)', () => {
    const validSignatureDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAMHSURBVHhe7d2xTdsAEAbg...validSignatureBase64StringOverTwoHundredCharsLongForTestingPurpose1234567890abcdefghijklmnopqrstuvwxyz';

    it('5. Bệnh nhân ký trực tiếp thành công, lưu thông tin người ký và thời điểm ký từ server', async () => {
      vi.mocked(mockRepo.findTemplateById).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết phẫu thuật',
        version: 1,
        content: 'Nội dung...',
      });

      vi.mocked(mockRepo.createSignedConsent).mockResolvedValue({
        id: 'signed-1',
        templateId: 'tpl-1',
        visitId: 'visit-100',
        signerName: 'Nguyễn Văn A',
        signatureUrl: validSignatureDataUrl,
        signedAt: new Date('2026-11-04T12:00:00Z'),
        template: { name: 'Cam kết phẫu thuật', version: 1 },
      });

      const result = await service.signConsent({
        templateId: 'tpl-1',
        visitId: 'visit-100',
        signerName: 'Nguyễn Văn A',
        signerType: 'PATIENT',
        signatureDataUrl: validSignatureDataUrl,
      });

      expect(result.id).toBe('signed-1');
      expect(result.signerName).toBe('Nguyễn Văn A');
      expect(result.signatureUrl).toBe(validSignatureDataUrl);
      expect(mockRepo.createSignedConsent).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'tpl-1',
          visitId: 'visit-100',
          signerName: 'Nguyễn Văn A',
          signatureUrl: validSignatureDataUrl,
          signedAt: expect.any(Date),
        })
      );
    });

    it('6. Chặn chữ ký rỗng hoặc chữ ký sai định dạng', async () => {
      vi.mocked(mockRepo.findTemplateById).mockResolvedValue({
        id: 'tpl-1',
        name: 'Cam kết',
        version: 1,
        content: 'Nội dung',
      });

      // Canvas rỗng (dưới 200 ký tự)
      await expect(
        service.signConsent({
          templateId: 'tpl-1',
          visitId: 'visit-100',
          signerName: 'Nguyễn Văn B',
          signatureDataUrl: 'data:image/png;base64,empty',
        })
      ).rejects.toMatchObject({ code: 'EMPTY_SIGNATURE_CANVAS' });

      // Định dạng không phải Data URL image
      await expect(
        service.signConsent({
          templateId: 'tpl-1',
          visitId: 'visit-100',
          signerName: 'Nguyễn Văn B',
          signatureDataUrl: 'invalid-string',
        })
      ).rejects.toMatchObject({ code: 'INVALID_SIGNATURE_FORMAT' });
    });
  });
});
