import type {
  ConsentTemplateDto,
  SignedConsentDto,
} from '@/features/consents/types/consents.types';

export class ConsentsMapper {
  static toTemplateDto(entity: any): ConsentTemplateDto {
    return {
      id: entity.id,
      name: entity.name,
      version: entity.version,
      content: entity.content,
      signedCount: entity._count?.signedConsents ?? 0,
    };
  }

  static toSignedConsentDto(entity: any): SignedConsentDto {
    // Trích xuất metadata từ trường content hoặc relation
    let signerType: 'PATIENT' | 'REPRESENTATIVE' = 'PATIENT';
    let relationship: string | undefined = undefined;

    return {
      id: entity.id,
      templateId: entity.templateId,
      templateName: entity.template?.name,
      templateVersion: entity.template?.version,
      visitId: entity.visitId,
      patientName: entity.visit?.patient?.fullName,
      signerName: entity.signerName,
      signerType,
      relationship,
      signatureUrl: entity.signatureUrl,
      signedAt: entity.signedAt instanceof Date ? entity.signedAt.toISOString() : String(entity.signedAt),
      contentSnapshot: entity.template?.content,
    };
  }
}
