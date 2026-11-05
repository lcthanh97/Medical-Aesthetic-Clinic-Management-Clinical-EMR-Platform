import type { ApiResponse } from '@/types/api';
import type {
  ConsentTemplateDto,
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
  CreateTemplateVersionDto,
  SignConsentDto,
  SignedConsentDto,
} from '@/features/consents/types/consents.types';

export const consentsApi = {
  // CON-01: Quản lý biểu mẫu
  async getTemplates(): Promise<ApiResponse<ConsentTemplateDto[]>> {
    const res = await fetch('/api/consents/templates');
    return res.json();
  },

  async getTemplateById(id: string): Promise<ApiResponse<ConsentTemplateDto>> {
    const res = await fetch(`/api/consents/templates/${id}`);
    return res.json();
  },

  async createTemplate(dto: CreateConsentTemplateDto): Promise<ApiResponse<ConsentTemplateDto>> {
    const res = await fetch('/api/consents/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return res.json();
  },

  async updateTemplate(
    id: string,
    dto: UpdateConsentTemplateDto
  ): Promise<ApiResponse<ConsentTemplateDto>> {
    const res = await fetch(`/api/consents/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return res.json();
  },

  async createTemplateVersion(
    templateId: string,
    dto: CreateTemplateVersionDto
  ): Promise<ApiResponse<ConsentTemplateDto>> {
    const res = await fetch(`/api/consents/templates/${templateId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return res.json();
  },

  // CON-02: Ký cam kết trên thiết bị
  async signConsent(dto: SignConsentDto): Promise<ApiResponse<SignedConsentDto>> {
    const res = await fetch('/api/consents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    return res.json();
  },

  async getSignedConsents(visitId?: string): Promise<ApiResponse<SignedConsentDto[]>> {
    const url = visitId ? `/api/consents?visitId=${encodeURIComponent(visitId)}` : '/api/consents';
    const res = await fetch(url);
    return res.json();
  },

  async getSignedConsentById(id: string): Promise<ApiResponse<SignedConsentDto>> {
    const res = await fetch(`/api/consents/${id}`);
    return res.json();
  },
};
