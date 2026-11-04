import type { IConsentsService } from '@/server/services/IConsentsService';
import { ConsentsValidator } from '@/server/validators/ConsentsValidator';
import { DomainError } from '@/domain/errors/DomainError';
import type { ApiResponse } from '@/types/api';
import type {
  ConsentTemplateDto,
  SignedConsentDto,
} from '@/features/consents/types/consents.types';

export class ConsentsController {
  constructor(private readonly consentsService: IConsentsService) {}

  /**
   * POST /api/consents/templates
   * Tạo mới biểu mẫu cam kết (CON-01).
   */
  async createTemplate(
    body: unknown
  ): Promise<{ status: number; body: ApiResponse<ConsentTemplateDto> }> {
    try {
      const validated = ConsentsValidator.validateCreateTemplate(body);
      const template = await this.consentsService.createTemplate(validated);

      return {
        status: 201,
        body: {
          success: true,
          data: template,
          message: 'Tạo biểu mẫu cam kết thành công (phiên bản v1).',
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'VALIDATION_ERROR', details: err.message || 'Dữ liệu không hợp lệ' },
        },
      };
    }
  }

  /**
   * PUT /api/consents/templates/[id]
   * Chỉnh sửa nội dung biểu mẫu khi chưa có bản ký (CON-01).
   */
  async updateTemplate(
    templateId: string,
    body: unknown
  ): Promise<{ status: number; body: ApiResponse<ConsentTemplateDto> }> {
    try {
      const validated = ConsentsValidator.validateUpdateTemplate(body);
      const updated = await this.consentsService.updateTemplate(templateId, validated);

      return {
        status: 200,
        body: {
          success: true,
          data: updated,
          message: 'Cập nhật nội dung biểu mẫu thành công.',
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: err.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'VALIDATION_ERROR', details: err.message || 'Dữ liệu không hợp lệ' },
        },
      };
    }
  }

  /**
   * POST /api/consents/templates/[id]
   * Phát hành phiên bản mới cho biểu mẫu cam kết (CON-01 Versioning).
   */
  async createTemplateVersion(
    templateId: string,
    body: unknown
  ): Promise<{ status: number; body: ApiResponse<ConsentTemplateDto> }> {
    try {
      const validated = ConsentsValidator.validateCreateVersion(body);
      const newVersion = await this.consentsService.createTemplateVersion(templateId, validated);

      return {
        status: 201,
        body: {
          success: true,
          data: newVersion,
          message: `Phát hành thành công phiên bản mới v${newVersion.version}.`,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: err.code === 'TEMPLATE_NOT_FOUND' ? 404 : 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * GET /api/consents/templates
   * Lấy danh sách toàn bộ biểu mẫu cam kết (CON-01).
   */
  async getAllTemplates(): Promise<{ status: number; body: ApiResponse<ConsentTemplateDto[]> }> {
    try {
      const templates = await this.consentsService.getAllTemplates();
      return {
        status: 200,
        body: {
          success: true,
          data: templates,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * GET /api/consents/templates/[id]
   * Lấy chi tiết biểu mẫu cam kết (CON-01).
   */
  async getTemplateById(id: string): Promise<{ status: number; body: ApiResponse<ConsentTemplateDto> }> {
    try {
      const template = await this.consentsService.getTemplateById(id);
      return {
        status: 200,
        body: {
          success: true,
          data: template,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError && err.code === 'TEMPLATE_NOT_FOUND') {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * POST /api/consents
   * Ký cam kết y tế điện tử bằng Signature Pad (CON-02).
   */
  async signConsent(
    body: unknown
  ): Promise<{ status: number; body: ApiResponse<SignedConsentDto> }> {
    try {
      const validated = ConsentsValidator.validateSignConsent(body);
      const signed = await this.consentsService.signConsent(validated);

      return {
        status: 201,
        body: {
          success: true,
          data: signed,
          message: 'Ký cam kết y tế thành công. Bản cam kết đã được ghi nhận trong hồ sơ lượt khám.',
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 400,
        body: {
          success: false,
          error: { code: 'VALIDATION_ERROR', details: err.message || 'Lỗi xác thực dữ liệu chữ ký' },
        },
      };
    }
  }

  /**
   * GET /api/consents/[id]
   * Lấy chi tiết bản cam kết đã ký (CON-02).
   */
  async getSignedConsentById(id: string): Promise<{ status: number; body: ApiResponse<SignedConsentDto> }> {
    try {
      const signed = await this.consentsService.getSignedConsentById(id);
      return {
        status: 200,
        body: {
          success: true,
          data: signed,
        },
      };
    } catch (err: any) {
      if (err instanceof DomainError && err.code === 'SIGNED_CONSENT_NOT_FOUND') {
        return {
          status: 404,
          body: {
            success: false,
            error: { code: err.code, details: err.message },
          },
        };
      }
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }

  /**
   * GET /api/consents?visitId=...
   * Lấy danh sách cam kết đã ký (CON-02).
   */
  async getSignedConsents(visitId?: string | null): Promise<{ status: number; body: ApiResponse<SignedConsentDto[]> }> {
    try {
      const list = visitId
        ? await this.consentsService.getSignedConsentsByVisitId(visitId)
        : await this.consentsService.getAllSignedConsents();

      return {
        status: 200,
        body: {
          success: true,
          data: list,
        },
      };
    } catch (err: any) {
      return {
        status: 500,
        body: {
          success: false,
          error: { code: 'INTERNAL_SERVER_ERROR', details: err.message },
        },
      };
    }
  }
}
