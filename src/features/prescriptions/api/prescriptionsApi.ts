import type {
  PrescriptionCreateInput,
  PrescriptionListView,
  PrescriptionMedicineView,
  PrescriptionUpdateInput,
  PrescriptionView,
  PrescriptionVisitView,
} from '@/features/prescriptions/schemas/prescriptions.schema';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { ...(init?.headers ?? {}), ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok || !result.success || result.data === undefined) {
    throw new Error(result.error || 'Không thể hoàn tất yêu cầu kê đơn.');
  }
  return result.data;
}

function query(parameters: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) if (value) search.set(key, value);
  return search.toString();
}

export const prescriptionsApi = {
  list(search?: string) {
    return request<PrescriptionListView>(`/api/prescriptions?${query({ q: search })}`);
  },
  getById(id: string) {
    return request<PrescriptionView>(`/api/prescriptions?${query({ id })}`);
  },
  assignedVisits(search?: string) {
    return request<PrescriptionVisitView[]>(`/api/prescriptions?${query({ resource: 'visits', q: search })}`);
  },
  medicines(search?: string) {
    return request<PrescriptionMedicineView[]>(`/api/prescriptions?${query({ resource: 'medicines', q: search })}`);
  },
  create(input: PrescriptionCreateInput) {
    return request<PrescriptionView>('/api/prescriptions', { method: 'POST', body: JSON.stringify(input) });
  },
  update(id: string, input: PrescriptionUpdateInput) {
    return request<PrescriptionView>(`/api/prescriptions?${query({ id })}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  issue(prescriptionId: string) {
    return request<{ status: string }>('/api/prescriptions/issue', { method: 'POST', body: JSON.stringify({ prescriptionId }) });
  },
};
