import type { VisitItem, VisitQueueStatus } from '@/features/reception/visits/types/visits.types';

export class VisitsMapper {
  static toVisitItem(visit: any, queueNumber?: number): VisitItem {
    const d = new Date(visit.visitDate || Date.now());
    const checkInTime = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Parse reason & receptionNote from medicalRecord.notes if stored as JSON or string
    let reason = 'Khám da liễu tổng quát';
    let receptionNote = '';
    let visitType = 'NEW';

    if (visit.medicalRecord?.notes) {
      try {
        const parsed = JSON.parse(visit.medicalRecord.notes);
        if (typeof parsed === 'object' && parsed !== null) {
          reason = parsed.reason || reason;
          receptionNote = parsed.receptionNote || '';
          visitType = parsed.visitType || visitType;
        } else {
          reason = visit.medicalRecord.notes;
        }
      } catch {
        reason = visit.medicalRecord.notes;
      }
    } else if (visit.reason) {
      reason = visit.reason;
    }

    return {
      id: visit.id,
      visitCode: `LK-${visit.id.slice(-6).toUpperCase()}`,
      queueNumber: queueNumber ?? visit.queueNumber ?? 1,
      patientId: visit.patient?.id || visit.patientId,
      patientCode: visit.patient?.patientCode || 'BN',
      patientName: visit.patient?.fullName || 'Bệnh nhân',
      patientPhone: visit.patient?.phone || null,
      patientDob: visit.patient?.dateOfBirth ? new Date(visit.patient.dateOfBirth).toISOString() : null,
      roomId: visit.room?.id || visit.roomId || '',
      roomName: visit.room?.name || 'Phòng khám đa khoa',
      visitType,
      reason,
      receptionNote: receptionNote || null,
      status: (visit.status as VisitQueueStatus) || 'WAITING',
      visitDate: d.toISOString(),
      checkInTime,
    };
  }
}

