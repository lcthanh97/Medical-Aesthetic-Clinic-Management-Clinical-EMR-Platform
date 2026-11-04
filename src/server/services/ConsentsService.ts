import type { IConsentsRepository } from '@/server/repositories/IConsentsRepository';
import type { IConsentsService } from './IConsentsService';
import { ConsentsMapper } from '@/server/mappers/ConsentsMapper';
import { ConsentProcedurePolicy } from '@/domain/policies/ConsentProcedurePolicy';
import { DomainError } from '@/domain/errors/DomainError';
import type {
  ConsentTemplateDto,
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  CreateTemplateVersionDto,
  SignConsentDto,
  SignedConsentDto,
} from '@/features/consents/types/consents.types';

export class ConsentsService implements IConsentsService {
  constructor(private readonly repository: IConsentsRepository) {}

  /**
   * CON-01: Tạo mới một biểu mẫu cam kết y tế (phiên bản đầu tiên v1).
   */
  async createTemplate(dto: CreateConsentTemplateDto): Promise<ConsentTemplateDto> {
    if (!dto.name?.trim()) {
      throw new DomainError('Tên biểu mẫu cam kết không được để trống.', 'INVALID_TEMPLATE_NAME');
    }
    if (!dto.content?.trim()) {
      throw new DomainError('Nội dung biểu mẫu cam kết không được để trống.', 'INVALID_TEMPLATE_CONTENT');
    }

    const template = await this.repository.createTemplate({
      name: dto.name.trim(),
      version: 1,
      content: dto.content.trim(),
    });

    return ConsentsMapper.toTemplateDto(template);
  }

  /**
   * CON-01: Chỉnh sửa trực tiếp nội dung biểu mẫu khi biểu mẫu chưa có bản ký nào.
   * Nếu đã phát sinh bản ký, hệ thống bắt buộc người dùng tạo phiên bản mới thay vì sửa đè.
   */
  async updateTemplate(id: string, dto: UpdateConsentTemplateDto): Promise<ConsentTemplateDto> {
    const existing = await this.repository.findTemplateById(id);
    if (!existing) {
      throw new DomainError(`Không tìm thấy biểu mẫu cam kết: ${id}`, 'TEMPLATE_NOT_FOUND');
    }

    if (!dto.content?.trim()) {
      throw new DomainError('Nội dung biểu mẫu không được để trống.', 'INVALID_TEMPLATE_CONTENT');
    }

    const signedCount = await this.repository.countSignedConsentsByTemplateId(id);
    ConsentProcedurePolicy.ensureCanEditTemplate(signedCount);

    const updated = await this.repository.updateTemplate(id, {
      name: dto.name?.trim() || existing.name,
      content: dto.content.trim(),
    });

    return ConsentsMapper.toTemplateDto(updated);
  }

  /**
   * CON-01: Quản lý phiên bản biểu mẫu (Template Versioning).
   * Tạo bản ghi phiên bản mới với version kế tiếp (v2, v3...) để phục vụ lựa chọn khi ký.
   */
  async createTemplateVersion(
    templateId: string,
    dto: CreateTemplateVersionDto
  ): Promise<ConsentTemplateDto> {
    const original = await this.repository.findTemplateById(templateId);
    if (!original) {
      throw new DomainError(`Không tìm thấy biểu mẫu cam kết: ${templateId}`, 'TEMPLATE_NOT_FOUND');
    }

    if (!dto.content?.trim()) {
      throw new DomainError('Nội dung phiên bản mới không được để trống.', 'INVALID_TEMPLATE_CONTENT');
    }

    const highestVersion = await this.repository.getHighestVersionForTemplate(original.name);
    const newVersion = highestVersion + 1;
    const templateName = dto.name?.trim() || original.name;

    const newTemplate = await this.repository.createTemplate({
      name: templateName,
      version: newVersion,
      content: dto.content.trim(),
    });

    return ConsentsMapper.toTemplateDto(newTemplate);
  }

  async getTemplateById(id: string): Promise<ConsentTemplateDto> {
    const template = await this.repository.findTemplateById(id);
    if (!template) {
      throw new DomainError(`Không tìm thấy biểu mẫu cam kết: ${id}`, 'TEMPLATE_NOT_FOUND');
    }
    return ConsentsMapper.toTemplateDto(template);
  }

  async getAllTemplates(): Promise<ConsentTemplateDto[]> {
    const templates = await this.repository.findAllTemplates();
    return templates.map(ConsentsMapper.toTemplateDto);
  }

  /**
   * CON-02: Bệnh nhân hoặc người đại diện ký trực tiếp trên thiết bị (Signature Pad).
   * Kiểm tra tính hợp lệ của chữ ký, lưu trữ và ghi nhận thời gian ký chính thức từ server.
   */
  async signConsent(dto: SignConsentDto): Promise<SignedConsentDto> {
    const template = await this.repository.findTemplateById(dto.templateId);
    if (!template) {
      throw new DomainError(`Không tìm thấy biểu mẫu cam kết: ${dto.templateId}`, 'TEMPLATE_NOT_FOUND');
    }

    if (!dto.visitId) {
      throw new DomainError('Vui lòng cung cấp mã lượt khám (visitId).', 'INVALID_VISIT_ID');
    }

    if (!dto.signerName?.trim()) {
      throw new DomainError('Vui lòng cung cấp họ tên người ký.', 'INVALID_SIGNER_NAME');
    }

    // 1. Kiểm tra tính hợp lệ của nét vẽ chữ ký điện tử (Canvas Signature)
    ConsentProcedurePolicy.ensureValidSignatureData(dto.signatureDataUrl);

    // 2. Server timestamp: Thời gian ký chính thức được ghi nhận bởi server
    const serverSignedAt = new Date();

    // 3. Tạo bản ghi cam kết đã ký (SignedConsent)
    const signedConsent = await this.repository.createSignedConsent({
      templateId: template.id,
      visitId: dto.visitId,
      signerName: dto.signerName.trim(),
      signatureUrl: dto.signatureDataUrl,
      signedAt: serverSignedAt,
    });

    return ConsentsMapper.toSignedConsentDto(signedConsent);
  }

  async getSignedConsentById(id: string): Promise<SignedConsentDto> {
    const signed = await this.repository.findSignedConsentById(id);
    if (!signed) {
      throw new DomainError(`Không tìm thấy bản cam kết đã ký: ${id}`, 'SIGNED_CONSENT_NOT_FOUND');
    }
    return ConsentsMapper.toSignedConsentDto(signed);
  }

  async getSignedConsentsByVisitId(visitId: string): Promise<SignedConsentDto[]> {
    const list = await this.repository.findSignedConsentsByVisitId(visitId);
    return list.map(ConsentsMapper.toSignedConsentDto);
  }

  async getAllSignedConsents(): Promise<SignedConsentDto[]> {
    const list = await this.repository.findAllSignedConsents();
    return list.map(ConsentsMapper.toSignedConsentDto);
  }

  // Legacy stubs compatibility
  async getById(id: string): Promise<unknown | null> {
    const signed = await this.repository.findSignedConsentById(id);
    if (signed) return ConsentsMapper.toSignedConsentDto(signed);
    const template = await this.repository.findTemplateById(id);
    if (template) return ConsentsMapper.toTemplateDto(template);
    return null;
  }

  async getList(): Promise<unknown[]> {
    return this.getAllSignedConsents();
  }
}
