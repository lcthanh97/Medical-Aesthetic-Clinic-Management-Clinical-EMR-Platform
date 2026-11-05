import type {
  PatientItem,
  PatientDetail,
  PatientVisitSummary,
  AllergyItem,
  MedicalHistoryItem,
} from '@/features/reception/types/reception.types';

export class ReceptionMapper {
  static toPatientItem(record: any): PatientItem {
    const allergies: AllergyItem[] = (record.allergies || []).map((a: any) => ({
      id: a.id,
      substance: a.substance,
      reaction: a.reaction,
      severity: a.severity,
    }));

    const histories: MedicalHistoryItem[] = (record.histories || []).map((h: any) => ({
      id: h.id,
      type: h.type,
      content: h.content,
    }));

    const visitsCount = record._count?.visits ?? record.visits?.length ?? 0;
    const lastVisitDate = record.visits?.[0]?.visitDate
      ? new Date(record.visits[0].visitDate).toISOString()
      : null;

    return {
      id: record.id,
      patientCode: record.patientCode,
      fullName: record.fullName,
      dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth).toISOString() : null,
      phone: record.phone ?? null,
      allergies,
      histories,
      visitsCount,
      lastVisitDate,
    };
  }

  static toPatientDetail(record: any): PatientDetail {
    const allergies: AllergyItem[] = (record.allergies || []).map((a: any) => ({
      id: a.id,
      substance: a.substance,
      reaction: a.reaction,
      severity: a.severity,
    }));

    const histories: MedicalHistoryItem[] = (record.histories || []).map((h: any) => ({
      id: h.id,
      type: h.type,
      content: h.content,
    }));

    const visits: PatientVisitSummary[] = (record.visits || []).map((v: any) => ({
      id: v.id,
      visitDate: new Date(v.visitDate).toISOString(),
      status: v.status,
      roomId: v.roomId,
      employeeId: v.employeeId,
    }));

    return {
      id: record.id,
      patientCode: record.patientCode,
      fullName: record.fullName,
      dateOfBirth: record.dateOfBirth ? new Date(record.dateOfBirth).toISOString() : null,
      phone: record.phone ?? null,
      allergies,
      histories,
      visits,
    };
  }
}
