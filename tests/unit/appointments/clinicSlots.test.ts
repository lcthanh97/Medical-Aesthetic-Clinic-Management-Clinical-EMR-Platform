import { describe, expect, it } from 'vitest'
import { clinicDate, clinicSlotDate, clinicTimes, isFutureClinicSlot } from '@/features/appointments/utils/timeSlots'

describe('clinic operating hours', () => {
  it('uses the Vietnam date even when UTC is still on the previous day', () => {
    expect(clinicDate(new Date('2030-05-10T17:01:00Z'))).toBe('2030-05-11')
    expect(clinicSlotDate('2030-05-11', '07:00')?.toISOString()).toBe('2030-05-11T00:00:00.000Z')
  })

  it('offers sixteen slots and excludes lunch and closing time', () => {
    expect(clinicTimes).toHaveLength(16)
    for (const time of ['11:00', '12:30', '17:00', '13:15']) {
      expect(clinicSlotDate('2030-05-11', time)).toBeNull()
    }
    expect(clinicSlotDate('2030-02-30', '07:00')).toBeNull()
  })

  it('rejects timestamps on or before now and off the half-hour grid', () => {
    const now = new Date('2030-05-11T00:00:00Z')
    expect(isFutureClinicSlot(now, now)).toBe(false)
    expect(isFutureClinicSlot(new Date('2030-05-11T00:30:01Z'), now)).toBe(false)
    expect(isFutureClinicSlot(new Date('2030-05-11T00:30:00Z'), now)).toBe(true)
  })
})
