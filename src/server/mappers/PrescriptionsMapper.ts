import type { PrescriptionView } from '@/features/prescriptions/schemas/prescriptions.schema';
import type { PrescriptionRecord } from '@/server/repositories/IPrescriptionsRepository';

export class PrescriptionsMapper {
  static toView(record: PrescriptionRecord, canEdit: boolean): PrescriptionView {
    return {
      id: record.id,
      status: record.status,
      employeeName: record.employee.fullName,
      visit: {
        id: record.visit.id,
        visitDate: record.visit.visitDate.toISOString(),
        status: record.visit.status,
        patient: record.visit.patient,
      },
      items: record.items.map((item) => ({
        id: item.id,
        medicineId: item.medicineId,
        medicine: item.medicine,
        quantity: item.quantity.toString(),
        dosage: item.dosage,
      })),
      canEdit,
    };
  }
}
