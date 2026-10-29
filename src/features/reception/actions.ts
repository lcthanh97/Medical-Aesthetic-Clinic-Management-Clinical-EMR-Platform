'use server';

import { PrismaReceptionRepository } from '@/infrastructure/database/repositories/PrismaReceptionRepository';
import { ReceptionService } from '@/server/services/ReceptionService';
import { revalidatePath } from 'next/cache';

const repository = new PrismaReceptionRepository();
const service = new ReceptionService(repository);

export async function getAppointmentsByDate(dateStr: string) {
  try {
    const appointments = await service.getAppointmentsByDate(dateStr);
    return { success: true, data: appointments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllAppointments() {
  try {
    const { prisma } = await import('@/infrastructure/database/prisma');
    const appointments = await prisma.appointment.findMany({
      include: {
        patient: true,
        room: true,
        employee: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
    return { success: true, data: JSON.parse(JSON.stringify(appointments)) };
  } catch (error: any) {
    console.error("getAllAppointments error:", error);
    return { success: false, error: error.message };
  }
}

export async function createVisit(patientId: string, employeeId?: string, roomId?: string) {
  try {
    const visit = await service.createVisit(patientId, employeeId, roomId);
    revalidatePath('/reception');
    return { success: true, data: visit };
  } catch (error: any) {
    console.error("Create visit error:", error);
    return { success: false, error: error.message };
  }
}

// Allergies
export async function getAllergiesByPatientId(patientId: string) {
  try {
    const allergies = await service.getAllergiesByPatientId(patientId);
    return { success: true, data: allergies };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAllergy(patientId: string, input: any) {
  try {
    const data = { ...input };
    if (data.diagnosisDate) {
      data.diagnosisDate = new Date(data.diagnosisDate);
    } else {
      data.diagnosisDate = null;
    }
    const allergy = await service.createAllergy(patientId, data);
    revalidatePath(`/reception/patients/${patientId}`);
    return { success: true, data: allergy };
  } catch (error: any) {
    console.error("Create allergy error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateAllergy(id: string, input: any) {
  try {
    const allergy = await service.updateAllergy(id, input);
    revalidatePath(`/reception/patients/${allergy.patientId}`);
    return { success: true, data: allergy };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAllergy(id: string, patientId: string) {
  try {
    await service.deleteAllergy(id);
    revalidatePath(`/reception/patients/${patientId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Medical History
export async function getMedicalHistoriesByPatientId(patientId: string) {
  try {
    const histories = await service.getMedicalHistoriesByPatientId(patientId);
    return { success: true, data: histories };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMedicalHistory(patientId: string, input: any) {
  try {
    const data = { ...input };
    if (data.diagnosisDate) {
      data.diagnosisDate = new Date(data.diagnosisDate);
    } else {
      data.diagnosisDate = null;
    }
    const history = await service.createMedicalHistory(patientId, data);
    revalidatePath(`/reception/patients/${patientId}`);
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMedicalHistory(id: string, input: any) {
  try {
    const history = await service.updateMedicalHistory(id, input);
    revalidatePath(`/reception/patients/${history.patientId}`);
    return { success: true, data: history };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMedicalHistory(id: string, patientId: string) {
  try {
    await service.deleteMedicalHistory(id);
    revalidatePath(`/reception/patients/${patientId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
