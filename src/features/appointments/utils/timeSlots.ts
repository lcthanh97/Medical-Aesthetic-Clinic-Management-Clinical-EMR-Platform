const clinicOffsetMs = 7 * 60 * 60 * 1000
export const slotDurationMs = 30 * 60 * 1000

// Operating hours from Luu Co Thanh's appointment scheduling change.
export const clinicTimes = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
] as const

function clinicClock(now: Date) {
  return new Date(now.getTime() + clinicOffsetMs).toISOString()
}

export function clinicDate(now = new Date()) {
  return clinicClock(now).slice(0, 10)
}

export function clinicSlotDate(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !clinicTimes.some((slot) => slot === time)) return null
  const slot = new Date(`${date}T${time}:00+07:00`)
  if (!Number.isFinite(slot.getTime()) || clinicClock(slot).slice(0, 16) !== `${date}T${time}`) return null
  return slot
}

export function isFutureClinicSlot(date: Date, now = new Date()) {
  if (!Number.isFinite(date.getTime()) || date <= now) return false
  const clinicTime = clinicClock(date)
  return clinicTime.endsWith(':00.000Z') && clinicTimes.some((time) => time === clinicTime.slice(11, 16))
}
