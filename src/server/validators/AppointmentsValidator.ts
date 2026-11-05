import type { Appointment } from '@prisma/client';

export interface AppointmentConflictCandidate {
  id?: string;
  scheduledAt: Date | string;
  patientId?: string;
  employeeId?: string | null;
  roomId?: string | null;
}

export class AppointmentsValidator {
  static readonly MIN_GAP_MINUTES = 30;

  /**
   * Kiểm tra trùng lặp lịch hẹn:
   * Thời gian giữa các lịch hẹn phải cách nhau ít nhất 30 phút.
   * Áp dụng theo từng tài nguyên: Cùng Bác sĩ, cùng Phòng khám, cùng Bệnh nhân,
   * hoặc cả 2 lịch hẹn đều chưa phân công Bác sĩ/Phòng.
   */
  static checkConflict(
    candidate: AppointmentConflictCandidate,
    existingAppointments: (Appointment & { patient?: any; room?: any; employee?: any })[],
    excludeAppointmentId?: string
  ): string | null {
    const candidateTime = new Date(candidate.scheduledAt).getTime();
    if (isNaN(candidateTime)) {
      return 'Thời gian hẹn không hợp lệ.';
    }

    const minGapMs = this.MIN_GAP_MINUTES * 60 * 1000;

    for (const appt of existingAppointments) {
      if (excludeAppointmentId && appt.id === excludeAppointmentId) {
        continue;
      }
      if (candidate.id && appt.id === candidate.id) {
        continue;
      }
      if (appt.status === 'CANCELLED') {
        continue;
      }

      const existingTime = new Date(appt.scheduledAt).getTime();
      const diffMs = Math.abs(candidateTime - existingTime);

      // Trùng giờ hoặc khoảng cách nhỏ hơn 30 phút (< 30 minutes)
      if (diffMs < minGapMs) {
        const timeStr = new Date(appt.scheduledAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        // 1. Cùng bệnh nhân
        if (candidate.patientId && appt.patientId && candidate.patientId === appt.patientId) {
          return `Bệnh nhân đã có lịch hẹn vào lúc ${timeStr}. Mỗi bệnh nhân chỉ được đặt các lịch hẹn cách nhau tối thiểu 30 phút.`;
        }

        // 2. Cùng bác sĩ / nhân viên
        if (
          candidate.employeeId &&
          appt.employeeId &&
          candidate.employeeId === appt.employeeId
        ) {
          const doctorName = appt.employee?.fullName ? ` (${appt.employee.fullName})` : '';
          return `Bác sĩ/nhân viên${doctorName} đã có lịch hẹn vào lúc ${timeStr}. Thời gian giữa các lịch hẹn của bác sĩ phải cách nhau ít nhất 30 phút.`;
        }

        // 3. Cùng phòng khám / dịch vụ
        if (candidate.roomId && appt.roomId && candidate.roomId === appt.roomId) {
          const roomName = appt.room?.name ? ` (${appt.room.name})` : '';
          return `Phòng khám${roomName} đã có lịch hẹn vào lúc ${timeStr}. Thời gian giữa các lịch hẹn tại phòng phải cách nhau ít nhất 30 phút.`;
        }

        // 4. Cả 2 đều chưa phân công bác sĩ và phòng (khung giờ chung)
        if (
          !candidate.employeeId &&
          !candidate.roomId &&
          !appt.employeeId &&
          !appt.roomId
        ) {
          return `Khung giờ này đã có lịch hẹn chưa phân công vào lúc ${timeStr}. Các lịch hẹn chưa phân công phải cách nhau ít nhất 30 phút hoặc vui lòng chỉ định cụ thể Bác sĩ/Phòng khám.`;
        }
      }
    }

    return null;
  }
}
