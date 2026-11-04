export interface CreateTemplateInput {
  name: string;
  version: number;
  content: string;
}

export interface UpdateTemplateInput {
  name?: string;
  content: string;
}

export interface CreateSignedConsentInput {
  templateId: string;
  visitId: string;
  signerName: string;
  signatureUrl: string;
  signedAt: Date;
}

export interface IConsentsRepository {
  // Biểu mẫu (CON-01 Templates)
  createTemplate(input: CreateTemplateInput): Promise<any>;
  updateTemplate(id: string, input: UpdateTemplateInput): Promise<any>;
  findTemplateById(id: string): Promise<any | null>;
  findTemplatesByName(name: string): Promise<any[]>;
  findAllTemplates(): Promise<any[]>;
  getHighestVersionForTemplate(name: string): Promise<number>;
  countSignedConsentsByTemplateId(templateId: string): Promise<number>;

  // Bản cam kết đã ký (CON-02 Signed Consents)
  createSignedConsent(input: CreateSignedConsentInput): Promise<any>;
  findSignedConsentById(id: string): Promise<any | null>;
  findSignedConsentsByVisitId(visitId: string): Promise<any[]>;
  findAllSignedConsents(): Promise<any[]>;

  // Legacy stubs compatibility
  findById(id: string): Promise<any | null>;
  findMany(): Promise<any[]>;
}
