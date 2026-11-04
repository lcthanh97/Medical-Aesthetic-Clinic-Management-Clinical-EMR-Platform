import {
  CreateConsentTemplateSchema,
  UpdateConsentTemplateSchema,
  CreateTemplateVersionSchema,
  SignConsentSchema,
} from '@/features/consents/schemas/consents.schema';
import type {
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  CreateTemplateVersionDto,
  SignConsentDto,
} from '@/features/consents/types/consents.types';

export class ConsentsValidator {
  static validateCreateTemplate(data: unknown): CreateConsentTemplateDto {
    return CreateConsentTemplateSchema.parse(data);
  }

  static validateUpdateTemplate(data: unknown): UpdateConsentTemplateDto {
    return UpdateConsentTemplateSchema.parse(data);
  }

  static validateCreateVersion(data: unknown): CreateTemplateVersionDto {
    return CreateTemplateVersionSchema.parse(data);
  }

  static validateSignConsent(data: unknown): SignConsentDto {
    return SignConsentSchema.parse(data);
  }
}
