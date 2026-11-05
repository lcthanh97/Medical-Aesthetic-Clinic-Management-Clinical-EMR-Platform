import type { ImagingOrderView } from '@/features/clinical-services/schemas/clinical-services.schema';
import type { ImagingOrderRecord } from '@/server/repositories/IClinicalServicesRepository';

export class ClinicalServicesMapper {
  static toImagingOrderView(
    record: ImagingOrderRecord,
    canWrite: boolean,
    writeBlockedReason: ImagingOrderView['writeBlockedReason'] = null,
  ): ImagingOrderView {
    return {
      id: record.id,
      type: record.type,
      status: record.status,
      orderedAt: record.orderedAt.toISOString(),
      orderedByName: record.orderedBy?.fullName ?? null,
      service: record.service,
      visit: {
        id: record.visit.id,
        visitDate: record.visit.visitDate.toISOString(),
        status: record.visit.status,
        patient: record.visit.patient,
      },
      imagingResults: record.imagingResults,
      canWrite,
      writeBlockedReason,
    };
  }
}
