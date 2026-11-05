import type { DoctorConsentFilters } from '@/features/consents/schemas/consents.schema';

export type AssignedConsentRecord = {
  id: string;
  visitId: string;
  treatmentPlanId: string | null;
  planVersion: number | null;
  signerName: string;
  signedAt: Date;
  createdAt: Date;
  template: { id: string; name: string; version: number; content: string };
  visit: {
    id: string;
    visitDate: Date;
    patientId: string;
    patient: { id: string; patientCode: string; fullName: string };
  };
  plan: { id: string; name: string; visitId: string; patientId: string } | null;
  patient: { id: string; fullName: string } | null;
  employee: { fullName: string } | null;
};

export type DoctorConsentPage = {
  items: AssignedConsentRecord[];
  total: number;
  page: number;
  pageSize: number;
  capped: boolean;
  options: {
    patients: Array<{ id: string; patientCode: string; fullName: string }>;
    plans: Array<{ id: string; name: string }>;
    templates: Array<{ id: string; name: string; version: number }>;
  };
};

export interface IConsentsRepository {
  findById(id:string):Promise<unknown|null>;
  findMany():Promise<unknown[]>;
  findManyForAssignedEmployee(
    actor: { accountId: string; employeeId: string; sessionId: string },
    filters: DoctorConsentFilters,
  ): Promise<{ items: AssignedConsentRecord[]; capped: boolean }>;
  create(input:unknown):Promise<unknown>;
  update(id:string,input:unknown):Promise<unknown>;
}
