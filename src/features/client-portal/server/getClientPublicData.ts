import { cache } from 'react'
import { prisma } from '@/infrastructure/database/prisma'

const number = (value: unknown) => Number(value ?? 0)
const iso = (value: Date | null | undefined) => value?.toISOString() ?? null

const empty = {
  connected: false,
  stats: { patients: 0, doctors: 0, appointments: 0, visits: 0 },
  departments: [] as string[],
  doctors: [] as Array<{ id: string; code: string; name: string; department: string; visits: number; appointments: number; nextWorkDate: string | null }>,
  services: [] as Array<{ id: string; code: string; name: string; category: string; price: number }>,
}

export const getClientPublicData = cache(async () => {
  try {
    const [doctors, services, patients, appointments, visits] = await Promise.all([
      prisma.employee.findMany({
        where: { department: { name: { contains: 'Da', mode: 'insensitive' } } },
        include: {
          department: true,
          schedules: { where: { workDate: { gte: new Date() } }, orderBy: { workDate: 'asc' }, take: 1 },
          _count: { select: { visits: true, appointments: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.serviceCatalog.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
      prisma.patient.count(),
      prisma.appointment.count(),
      prisma.visit.count(),
    ])
    return {
      connected: true,
      stats: { patients, doctors: doctors.length, appointments, visits },
      departments: [...new Set(doctors.map((doctor) => doctor.department?.name).filter((name): name is string => Boolean(name)))],
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        code: doctor.employeeCode,
        name: doctor.fullName,
        department: doctor.department?.name ?? 'Chưa phân khoa',
        visits: doctor._count.visits,
        appointments: doctor._count.appointments,
        nextWorkDate: iso(doctor.schedules[0]?.workDate),
      })),
      services: services.map((service) => ({
        id: service.id,
        code: service.code,
        name: service.name,
        category: service.category,
        price: number(service.basePrice),
      })),
    }
  } catch (error) {
    console.error('[client-public] Cannot read Neon data.', error)
    return empty
  }
})

export type ClientPublicData = Awaited<ReturnType<typeof getClientPublicData>>
