import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { prisma, getPatientSession, getStaffSession } = vi.hoisted(() => ({
  prisma: { appointment: { findMany: vi.fn() }, $transaction: vi.fn() },
  getPatientSession: vi.fn(),
  getStaffSession: vi.fn(),
}))
vi.mock('@/infrastructure/database/prisma', () => ({ prisma }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/auth/patient-session', () => ({ getPatientSession }))
vi.mock('@/server/auth/staff-session', () => ({ getStaffSession }))

import { createCustomerAppointment, createReceptionAppointment, getCustomerAppointmentSlots } from '@/features/appointments/actions'
import { patientReturnPath } from '@/features/client-portal/patientReturnPath'

describe('customer booking availability and access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPatientSession.mockResolvedValue(null)
    getStaffSession.mockResolvedValue(null)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-05-11T00:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('returns only slot time and status', async () => {
    prisma.appointment.findMany.mockResolvedValue([{
      id: 'booked', patientId: 'private', employeeId: 'doctor-1', roomId: null,
      scheduledAt: new Date('2030-05-11T00:30:00Z'), status: 'SCHEDULED',
    }])
    const result = await getCustomerAppointmentSlots('2030-05-11', 'doctor-1')
    expect(result.success && result.data.slice(0, 3)).toEqual([
      { time: '07:00', status: 'past' }, { time: '07:30', status: 'booked' }, { time: '08:00', status: 'available' },
    ])
  })

  it('rejects outside operating hours before a transaction', async () => {
    getPatientSession.mockResolvedValue({ patientId: 'account-patient' })
    const result = await createCustomerAppointment({serviceId: 'service-1', scheduledAt: '2030-05-11T05:00:00Z'})
    expect(result.success).toBe(false)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('requires a patient session and protects the reception action separately', async () => {
    const input = { scheduledAt: '2030-05-11T00:30:00Z', serviceId: 'service-1' }
    expect(await createCustomerAppointment(input)).toMatchObject({ success: false, error: expect.stringContaining('đăng nhập') })
    expect(await createReceptionAppointment({ ...input, fullName: 'Khách vãng lai', phone: '0900000000' }))
      .toMatchObject({ success: false, error: expect.stringContaining('lễ tân') })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('uses the patient ID from the session and ignores a forged client ID', async () => {
    getPatientSession.mockResolvedValue({ patientId: 'account-patient' })
    const create = vi.fn().mockResolvedValue({ id: 'appointment-1' })
    const tx = {
      serviceCatalog: { findFirst: vi.fn().mockResolvedValue({ id: 'service-1' }) },
      appointment: { findMany: vi.fn().mockResolvedValue([]), create },
    }
    prisma.$transaction.mockImplementationOnce(async callback => callback(tx))
    const input = { scheduledAt: '2030-05-11T00:30:00Z', serviceId: 'service-1', patientId: 'forged-id' }
    expect(await createCustomerAppointment(input)).toMatchObject({ success: true })
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ patientId: 'account-patient', serviceId: 'service-1' }),
    }))
  })

  it('allows a return to booking or chat and blocks external destinations', () => {
    expect(patientReturnPath('/khachhang/appointments#dat-lich')).toBe('/khachhang/appointments#dat-lich')
    expect(patientReturnPath('/khachhang#ai-chan-doan')).toBe('/khachhang#ai-chan-doan')
    expect(patientReturnPath('//other.example')).toBe('/khachhang/profile')
  })
})
