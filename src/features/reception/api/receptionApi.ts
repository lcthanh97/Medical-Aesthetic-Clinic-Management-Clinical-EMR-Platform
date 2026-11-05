import type { ApiResponse } from '@/types/api';
import type {
  PatientListQuery,
  PatientListResponse,
  PatientDetail,
  CreatePatientDto,
  UpdatePatientDto,
  DuplicateCheckResult,
  ReceptionStats,
  PatientVisitSummary,
} from '../types/reception.types';

export const receptionApi = {
  async getPatients(params?: PatientListQuery): Promise<ApiResponse<PatientListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    const res = await fetch(`/api/patients${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getPatient(id: string): Promise<ApiResponse<PatientDetail>> {
    const res = await fetch(`/api/patients/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async createPatient(data: CreatePatientDto): Promise<ApiResponse<PatientDetail>> {
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updatePatient(id: string, data: UpdatePatientDto): Promise<ApiResponse<PatientDetail>> {
    const res = await fetch(`/api/patients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async checkDuplicate(query: {
    phone?: string;
    fullName?: string;
    dateOfBirth?: string;
  }): Promise<ApiResponse<DuplicateCheckResult>> {
    const searchParams = new URLSearchParams();
    if (query.phone) searchParams.set('phone', query.phone);
    if (query.fullName) searchParams.set('fullName', query.fullName);
    if (query.dateOfBirth) searchParams.set('dateOfBirth', query.dateOfBirth);

    const res = await fetch(`/api/patients/check-duplicate?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getStats(): Promise<ApiResponse<ReceptionStats>> {
    const res = await fetch('/api/patients/stats', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getPatientVisits(patientId: string): Promise<ApiResponse<PatientVisitSummary[]>> {
    const res = await fetch(`/api/patients/${patientId}/history`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },
};
