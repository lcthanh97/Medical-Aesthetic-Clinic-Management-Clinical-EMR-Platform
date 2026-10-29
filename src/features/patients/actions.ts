'use server';

import { prisma } from '@/infrastructure/database/prisma';

export async function getPatients() {
  try {
    const data = await prisma.patient.findMany({ select: { id: true, fullName: true, patientCode: true } });
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
