export type SignerType = 'PATIENT' | 'REPRESENTATIVE';

export interface ConsentTemplateDto {
  id: string;
  name: string;
  version: number;
  content: string;
  procedureType?: string;
  signedCount?: number;
}

export interface CreateConsentTemplateDto {
  name: string;
  content: string;
  procedureType?: string;
}

export interface UpdateConsentTemplateDto {
  name?: string;
  content: string;
  procedureType?: string;
}

export interface CreateTemplateVersionDto {
  content: string;
  name?: string;
  procedureType?: string;
}

export interface SignConsentDto {
  templateId: string;
  visitId: string;
  signerName: string;
  signerType?: SignerType;
  relationship?: string;
  signatureDataUrl: string;
  notes?: string;
}

export interface SignedConsentDto {
  id: string;
  templateId: string;
  templateName?: string;
  templateVersion?: number;
  visitId: string;
  patientName?: string;
  signerName: string;
  signerType?: SignerType;
  relationship?: string;
  signatureUrl: string;
  signedAt: string;
  contentSnapshot?: string;
}

export interface ConsentsViewModel {
  templates: ConsentTemplateDto[];
  signedConsents: SignedConsentDto[];
  activeTemplate: ConsentTemplateDto | null;
}
