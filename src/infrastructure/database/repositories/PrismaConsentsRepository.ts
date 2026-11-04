import { prisma } from '@/infrastructure/database/prisma';
import type {
  IConsentsRepository,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateSignedConsentInput,
} from '@/server/repositories/IConsentsRepository';

export class PrismaConsentsRepository implements IConsentsRepository {
  async createTemplate(input: CreateTemplateInput): Promise<any> {
    return prisma.consentTemplate.create({
      data: {
        name: input.name,
        version: input.version,
        content: input.content,
      },
      include: {
        _count: {
          select: { signedConsents: true },
        },
      },
    });
  }

  async updateTemplate(id: string, input: UpdateTemplateInput): Promise<any> {
    return prisma.consentTemplate.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        content: input.content,
      },
      include: {
        _count: {
          select: { signedConsents: true },
        },
      },
    });
  }

  async findTemplateById(id: string): Promise<any | null> {
    return prisma.consentTemplate.findUnique({
      where: { id },
      include: {
        _count: {
          select: { signedConsents: true },
        },
      },
    });
  }

  async findTemplatesByName(name: string): Promise<any[]> {
    return prisma.consentTemplate.findMany({
      where: { name },
      orderBy: { version: 'desc' },
      include: {
        _count: {
          select: { signedConsents: true },
        },
      },
    });
  }

  async findAllTemplates(): Promise<any[]> {
    return prisma.consentTemplate.findMany({
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
      include: {
        _count: {
          select: { signedConsents: true },
        },
      },
    });
  }

  async getHighestVersionForTemplate(name: string): Promise<number> {
    const latest = await prisma.consentTemplate.findFirst({
      where: { name },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest?.version ?? 0;
  }

  async countSignedConsentsByTemplateId(templateId: string): Promise<number> {
    return prisma.signedConsent.count({
      where: { templateId },
    });
  }

  async createSignedConsent(input: CreateSignedConsentInput): Promise<any> {
    return prisma.signedConsent.create({
      data: {
        templateId: input.templateId,
        visitId: input.visitId,
        signerName: input.signerName,
        signatureUrl: input.signatureUrl,
        signedAt: input.signedAt,
      },
      include: {
        template: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });
  }

  async findSignedConsentById(id: string): Promise<any | null> {
    return prisma.signedConsent.findUnique({
      where: { id },
      include: {
        template: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
    });
  }

  async findSignedConsentsByVisitId(visitId: string): Promise<any[]> {
    return prisma.signedConsent.findMany({
      where: { visitId },
      include: {
        template: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
    });
  }

  async findAllSignedConsents(): Promise<any[]> {
    return prisma.signedConsent.findMany({
      include: {
        template: true,
        visit: {
          include: {
            patient: true,
          },
        },
      },
      orderBy: { signedAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any | null> {
    return this.findSignedConsentById(id) || this.findTemplateById(id);
  }

  async findMany(): Promise<any[]> {
    return this.findAllSignedConsents();
  }
}
