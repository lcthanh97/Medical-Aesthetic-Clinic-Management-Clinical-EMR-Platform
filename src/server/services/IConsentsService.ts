import type {
  ConsentTemplateDto,
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  CreateTemplateVersionDto,
  SignConsentDto,
  SignedConsentDto,
} from '@/features/consents/types/consents.types';

export interface IConsentsService {
  // CON-01: Biểu mẫu cam kết & Versioning
  createTemplate(dto: CreateConsentTemplateDto): Promise<ConsentTemplateDto>;
  updateTemplate(id: string, dto: UpdateConsentTemplateDto): Promise<ConsentTemplateDto>;
  createTemplateVersion(templateId: string, dto: CreateTemplateVersionDto): Promise<ConsentTemplateDto>;
  getTemplateById(id: string): Promise<ConsentTemplateDto>;
  getAllTemplates(): Promise<ConsentTemplateDto[]>;

  // CON-02: Ký cam kết trên thiết bị
  signConsent(dto: SignConsentDto): Promise<SignedConsentDto>;
  getSignedConsentById(id: string): Promise<SignedConsentDto>;
  getSignedConsentsByVisitId(visitId: string): Promise<SignedConsentDto[]>;
  getAllSignedConsents(): Promise<SignedConsentDto[]>;

  // Legacy stubs compatibility
  getById(id: string): Promise<unknown | null>;
  getList(): Promise<unknown[]>;
}
