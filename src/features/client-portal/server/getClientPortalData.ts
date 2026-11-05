import { prisma } from '@/infrastructure/database/prisma'
import { cache } from 'react'

const iso = (value: Date | null | undefined) => value ? value.toISOString() : null
const money = (value: unknown) => Number(value ?? 0)

export async function resolvePortalPatientId(explicitId?: string) {
  if (explicitId) return explicitId
  if (process.env.CLIENT_PATIENT_ID) return process.env.CLIENT_PATIENT_ID
  const candidates = await prisma.patient.findMany({ select: { id: true, _count: { select: { visits: true, appointments: true, treatmentPlans: true } } }, take: 100 })
  return selectMostActivePatient(candidates)
}

export function selectMostActivePatient(candidates: Array<{ id: string; _count: { visits: number; appointments: number; treatmentPlans: number } }>) {
  return [...candidates].sort((a, b) => (b._count.visits + b._count.appointments + b._count.treatmentPlans) - (a._count.visits + a._count.appointments + a._count.treatmentPlans))[0]?.id ?? null
}

const emptyPortalData = {
  stats: { patientCount: 0, doctorCount: 0 },
  doctors: [],
  services: [],
  patient: null,
}

async function loadClientPortalData(explicitId?: string) {
  const patientId = await resolvePortalPatientId(explicitId)
  const [patient, doctors, services, patientCount] = await Promise.all([
    patientId ? prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        allergies: { orderBy: { diagnosisDate: 'desc' } }, histories: { orderBy: { diagnosisDate: 'desc' } },
        appointments: { include: { employee: true, room: true }, orderBy: { scheduledAt: 'desc' }, take: 20 },
        treatmentPlans: { include: { createdBy: true, protocolTemplate: true, stages: { include: { steps: true }, orderBy: { orderNo: 'asc' } }, images: { orderBy: { capturedAt: 'desc' } } }, orderBy: { updatedAt: 'desc' } },
        visits: { include: {
          employee: true, room: true, medicalRecord: true,
          orders: { include: { service: true, labResults: true, imagingResults: true }, orderBy: { orderedAt: 'desc' } },
          prescriptions: { include: { employee: true, items: { include: { medicine: true } } } },
          invoices: { include: { items: true, payments: true } },
          treatmentImages: { orderBy: { capturedAt: 'desc' } },
          consents: { include: { template: true }, orderBy: { signedAt: 'desc' } },
        }, orderBy: { visitDate: 'desc' } },
      },
    }) : null,
    prisma.employee.findMany({ where: { department: { name: { contains: 'Da', mode: 'insensitive' } } }, include: { department: true, _count: { select: { visits: true, appointments: true } } }, orderBy: { fullName: 'asc' }, take: 12 }),
    prisma.serviceCatalog.findMany({ where: { active: true }, orderBy: { name: 'asc' }, take: 12 }),
    prisma.patient.count(),
  ])

  const notifications = patient ? await prisma.notification.findMany({
    where: { OR: [{ recipient: patient.patientCode }, ...(patient.phone ? [{ recipient: patient.phone }] : []), { recipient: patient.fullName }] },
    orderBy: { scheduledAt: 'desc' }, take: 30,
  }) : []

  return {
    stats: { patientCount, doctorCount: doctors.length },
    doctors: doctors.map((d) => ({ id: d.id, code: d.employeeCode, name: d.fullName, department: d.department?.name ?? 'Da liễu', visitCount: d._count.visits, appointmentCount: d._count.appointments })),
    services: services.map((s) => ({ id: s.id, code: s.code, name: s.name, category: s.category, price: money(s.basePrice) })),
    patient: patient ? {
      id: patient.id, code: patient.patientCode, name: patient.fullName, phone: patient.phone, dateOfBirth: iso(patient.dateOfBirth),
      allergies: patient.allergies.map((x) => ({ id: x.id, substance: x.substance, reaction: x.reaction, severity: x.severity, date: iso(x.diagnosisDate) })),
      histories: patient.histories.map((x) => ({ id: x.id, type: x.type, content: x.content, date: iso(x.diagnosisDate) })),
      appointments: patient.appointments.map((x) => ({ id: x.id, date: iso(x.scheduledAt), status: x.status, doctor: x.employee?.fullName ?? null, room: x.room?.name ?? null })),
      treatmentPlans: patient.treatmentPlans.map((p) => ({ id: p.id, name: p.name, diagnosis: p.diagnosisSummary, goal: p.goal, status: p.status, version: p.version, doctor: p.createdBy.fullName, protocol: p.protocolTemplate?.name ?? null, startDate: iso(p.startDate), expectedEndDate: iso(p.expectedEndDate), updatedAt: iso(p.updatedAt), stages: p.stages.map((s) => ({ id: s.id, name: s.name, type: s.stageType, status: s.status, goal: s.goal, order: s.orderNo, steps: s.steps.map((st) => ({ id: st.id, content: st.content, status: st.status, order: st.orderNo })) })), images: p.images.map((i) => ({ id: i.id, url: i.imageUrl, phase: i.phase, type: i.imageType, area: i.bodyArea, description: i.description, date: iso(i.capturedAt) })) })),
      visits: patient.visits.map((v) => ({ id: v.id, date: iso(v.visitDate), status: v.status, doctor: v.employee?.fullName ?? null, room: v.room?.name ?? null, record: v.medicalRecord ? { preliminary: v.medicalRecord.preliminaryDiagnosis, final: v.medicalRecord.finalDiagnosis, notes: v.medicalRecord.notes } : null,
        orders: v.orders.map((o) => ({ id: o.id, date: iso(o.orderedAt), type: o.type, status: o.status, service: o.service?.name ?? null, labs: o.labResults.map((r) => ({ id: r.id, name: r.testName, result: r.result, unit: r.unit })), images: o.imagingResults.map((r) => ({ id: r.id, type: r.imagingType, conclusion: r.conclusion, url: r.fileUrl })) })),
        prescriptions: v.prescriptions.map((p) => ({ id: p.id, status: p.status, doctor: p.employee.fullName, items: p.items.map((i) => ({ id: i.id, medicine: i.medicine.name, unit: i.medicine.unit, quantity: money(i.quantity), dosage: i.dosage })) })),
        invoices: v.invoices.map((i) => ({ id: i.id, total: money(i.total), status: i.status, paid: i.payments.reduce((sum, p) => sum + money(p.amount), 0), payments: i.payments.map((p) => ({ id: p.id, amount: money(p.amount), method: p.method, date: iso(p.paidAt) })), items: i.items.map((it) => ({ id: it.id, description: it.description, quantity: money(it.quantity), total: money(it.total) })) })),
        treatmentImages: v.treatmentImages.map((i) => ({ id: i.id, url: i.imageUrl, phase: i.phase, type: i.imageType, area: i.bodyArea, description: i.description, date: iso(i.capturedAt) })),
        consents: v.consents.map((c) => ({ id: c.id, name: c.template.name, version: c.template.version, signer: c.signerName, signedAt: iso(c.signedAt), documentUrl: c.documentUrl }))
      })),
      notifications: notifications.map((n) => ({ id: n.id, type: n.type, content: n.content, status: n.status, scheduledAt: iso(n.scheduledAt) })),
    } : null,
  }
}

/**
 * React cache prevents the client layout and its page from issuing the same
 * expensive Neon query twice during a single server render. A disconnected
 * development database degrades to explicit empty states instead of taking
 * down the public portal.
 */
export const getClientPortalData = cache(async (explicitId?: string) => {
  try {
    return await loadClientPortalData(explicitId)
  } catch (error) {
    console.error('[client-portal] Database unavailable, rendering empty states.', error)
    return emptyPortalData
  }
})

export type ClientPortalData = Awaited<ReturnType<typeof getClientPortalData>>
