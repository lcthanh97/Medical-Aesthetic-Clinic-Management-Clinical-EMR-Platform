export interface ClinicSlot {
  time: string;           // "07:00"
  endTime: string;        // "07:30"
  timeRange: string;      // "07:00 - 07:30"
  period: 'morning' | 'afternoon';
}

/**
 * Danh sách 16 khung giờ hoạt động tiêu chuẩn của bệnh viện / phòng khám:
 * - Buổi sáng: 07h00 đến 11h00 (8 khung giờ, mỗi khung 30 phút)
 * - Buổi chiều: 13h00 đến 17h00 (8 khung giờ, mỗi khung 30 phút)
 */
export const CLINIC_OPERATING_SLOTS: ClinicSlot[] = [
  // Buổi sáng: 07:00 - 11:00
  { time: '07:00', endTime: '07:30', timeRange: '07:00 - 07:30', period: 'morning' },
  { time: '07:30', endTime: '08:00', timeRange: '07:30 - 08:00', period: 'morning' },
  { time: '08:00', endTime: '08:30', timeRange: '08:00 - 08:30', period: 'morning' },
  { time: '08:30', endTime: '09:00', timeRange: '08:30 - 09:00', period: 'morning' },
  { time: '09:00', endTime: '09:30', timeRange: '09:00 - 09:30', period: 'morning' },
  { time: '09:30', endTime: '10:00', timeRange: '09:30 - 10:00', period: 'morning' },
  { time: '10:00', endTime: '10:30', timeRange: '10:00 - 10:30', period: 'morning' },
  { time: '10:30', endTime: '11:00', timeRange: '10:30 - 11:00', period: 'morning' },
  // Buổi chiều: 13:00 - 17:00
  { time: '13:00', endTime: '13:30', timeRange: '13:00 - 13:30', period: 'afternoon' },
  { time: '13:30', endTime: '14:00', timeRange: '13:30 - 14:00', period: 'afternoon' },
  { time: '14:00', endTime: '14:30', timeRange: '14:00 - 14:30', period: 'afternoon' },
  { time: '14:30', endTime: '15:00', timeRange: '14:30 - 15:00', period: 'afternoon' },
  { time: '15:00', endTime: '15:30', timeRange: '15:00 - 15:30', period: 'afternoon' },
  { time: '15:30', endTime: '16:00', timeRange: '15:30 - 16:00', period: 'afternoon' },
  { time: '16:00', endTime: '16:30', timeRange: '16:00 - 16:30', period: 'afternoon' },
  { time: '16:30', endTime: '17:00', timeRange: '16:30 - 17:00', period: 'afternoon' },
];

export interface SlotAvailabilityInfo extends ClinicSlot {
  isBooked: boolean;
  isPast: boolean;
  isAvailable: boolean;
  reason?: string;
  bookedDetails?: {
    doctorName?: string;
    roomName?: string;
    patientName?: string;
  };
}

export interface ComputeSlotsParams {
  dateStr: string; // 'YYYY-MM-DD'
  existingAppointments: any[];
  employeeId?: string;
  roomId?: string;
  patientPhone?: string;
  now?: Date;
}

/**
 * Tính toán tính khả dụng của từng khung giờ trong ngày:
 * - isPast: Khung giờ đã trôi qua so với thời gian hiện tại (nếu là hôm nay)
 * - isBooked: Khung giờ đã có lịch hẹn đặt trước (trùng trong khoảng < 30 phút)
 * - isAvailable: Khung giờ còn trống và có thể đặt (!isBooked && !isPast)
 */
export function computeSlotsAvailability(params: ComputeSlotsParams): SlotAvailabilityInfo[] {
  const { dateStr, existingAppointments = [], employeeId, roomId, patientPhone, now = new Date() } = params;

  return CLINIC_OPERATING_SLOTS.map((slot) => {
    // Tạo mốc thời gian của slot theo giờ địa phương của dateStr
    const slotDateTime = new Date(`${dateStr}T${slot.time}:00`);
    const slotTimeMs = slotDateTime.getTime();

    // 1. Kiểm tra khung giờ đã qua trong ngày
    const isPast = slotTimeMs <= now.getTime();

    // 2. Tìm các lịch hẹn trùng lặp trong khoảng cách < 30 phút
    const overlapping = existingAppointments.filter((appt) => {
      if (appt.status === 'CANCELLED') return false;
      const apptTimeMs = new Date(appt.scheduledAt).getTime();
      return Math.abs(slotTimeMs - apptTimeMs) < 30 * 60 * 1000;
    });

    let isBooked = false;
    let reason: string | undefined;
    let bookedDetails: SlotAvailabilityInfo['bookedDetails'];

    if (overlapping.length > 0) {
      // a. Trùng số điện thoại của chính bệnh nhân
      if (patientPhone) {
        const patientConflict = overlapping.find((a) => a.patient?.phone === patientPhone);
        if (patientConflict) {
          isBooked = true;
          reason = 'Bạn đã có lịch hẹn vào khung giờ này.';
        }
      }

      // b. Bệnh nhân đã chọn Bác sĩ cụ thể
      if (!isBooked && employeeId) {
        const docConflict = overlapping.find((a) => a.employeeId === employeeId);
        if (docConflict) {
          isBooked = true;
          const docName = docConflict.employee?.fullName || 'Bác sĩ';
          reason = `Bác sĩ ${docName} đã có lịch hẹn.`;
          bookedDetails = { doctorName: docName };
        }
      }

      // c. Bệnh nhân đã chọn Phòng khám cụ thể
      if (!isBooked && roomId) {
        const roomConflict = overlapping.find((a) => a.roomId === roomId);
        if (roomConflict) {
          isBooked = true;
          const rName = roomConflict.room?.name || 'Phòng khám';
          reason = `Phòng khám ${rName} đã có lịch hẹn.`;
          bookedDetails = { roomName: rName };
        }
      }

      // d. Chưa chọn Bác sĩ hoặc Phòng (khung giờ chung)
      if (!isBooked && !employeeId && !roomId) {
        // Nếu có lịch hẹn chưa phân công Bác sĩ và Phòng -> Chặn theo quy định
        const unassignedConflict = overlapping.find((a) => !a.employeeId && !a.roomId);
        if (unassignedConflict) {
          isBooked = true;
          reason = 'Khung giờ này đã có lịch hẹn chưa phân công.';
        } else {
          // Khi không chọn bác sĩ/phòng, nếu khung giờ này đã có lịch hẹn đặt trước
          isBooked = true;
          const firstAppt = overlapping[0];
          const docName = firstAppt?.employee?.fullName;
          const rName = firstAppt?.room?.name;
          reason = docName 
            ? `Đã có lịch đặt (${docName})`
            : rName 
            ? `Đã có lịch đặt (${rName})`
            : 'Đã có lịch hẹn đặt trước.';
          bookedDetails = { doctorName: docName, roomName: rName };
        }
      }
    }

    const isAvailable = !isPast && !isBooked;

    return {
      time: slot.time,
      endTime: slot.endTime,
      timeRange: slot.timeRange,
      period: slot.period,
      isBooked,
      isPast,
      isAvailable,
      reason,
      bookedDetails,
    };
  });
}

