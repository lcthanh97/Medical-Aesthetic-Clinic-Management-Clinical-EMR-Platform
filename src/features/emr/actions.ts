'use server';

import { PrismaEmrRepository } from '@/infrastructure/database/repositories/PrismaEmrRepository';
import { EmrService } from '@/server/services/EmrService';
import { revalidatePath } from 'next/cache';

const repository = new PrismaEmrRepository();
const service = new EmrService(repository);

export async function getPatients(search?: string) {
  try {
    const data = await service.getList(search);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('getPatients error:', error);
    return { success: false, error: error.message };
  }
}

export async function getPatientFullEMR(patientId: string) {
  try {
    const data = await service.getPatientFullEMR(patientId);
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('getPatientFullEMR error:', error);
    return { success: false, error: error.message };
  }
}

export async function createPatient(input: { fullName: string; phone?: string; dateOfBirth?: string }) {
  try {
    const data = await service.createPatient(input);
    revalidatePath('/emr');
    revalidatePath('/bacsi/emr');
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('createPatient error:', error);
    return { success: false, error: error.message };
  }
}

export async function updatePatient(id: string, input: { fullName?: string; phone?: string; dateOfBirth?: string }) {
  try {
    const data = await service.updatePatient(id, input);
    revalidatePath('/emr');
    revalidatePath('/bacsi/emr');
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('updatePatient error:', error);
    return { success: false, error: error.message };
  }
}

export async function saveMedicalRecord(visitId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string }) {
  try {
    const data = await service.saveMedicalRecord(visitId, input);
    revalidatePath('/emr');
    revalidatePath('/bacsi/emr');
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('saveMedicalRecord error:', error);
    return { success: false, error: error.message };
  }
}

export async function addPatientAllergy(patientId: string, input: { substance: string; severity?: string; reaction?: string }) {
  try {
    const data = await service.addPatientAllergy(patientId, input);
    revalidatePath('/emr');
    revalidatePath('/bacsi/emr');
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('addPatientAllergy error:', error);
    return { success: false, error: error.message };
  }
}

export async function addPatientHistory(patientId: string, input: { type: string; content: string }) {
  try {
    const data = await service.addPatientHistory(patientId, input);
    revalidatePath('/emr');
    revalidatePath('/bacsi/emr');
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('addPatientHistory error:', error);
    return { success: false, error: error.message };
  }
}

export async function createQuickVisit(patientId: string, input: { preliminaryDiagnosis?: string; finalDiagnosis?: string; notes?: string; employeeId?: string; roomId?: string }) {
  try {
    const data = await service.createQuickVisit(patientId, input);
    revalidatePath('/emr');
    revalidatePath('/bacsi/emr');
    return { success: true, data: JSON.parse(JSON.stringify(data)) };
  } catch (error: any) {
    console.error('createQuickVisit error:', error);
    return { success: false, error: error.message };
  }
}
