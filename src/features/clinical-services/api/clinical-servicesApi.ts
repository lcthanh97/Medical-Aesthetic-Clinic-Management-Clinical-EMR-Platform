import type { ImagingOrderView, ImagingResultInput, ImagingResultUpdateInput } from '../schemas/clinical-services.schema';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init });
  const body = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || !body?.success || body.data === undefined) {
    throw new Error(body?.error ?? 'Không thể tải dữ liệu hình ảnh cận lâm sàng.');
  }
  return body.data;
}

export const clinicalServicesApi = {
  list(search = '') {
    const query = new URLSearchParams();
    if (search.trim()) query.set('q', search.trim());
    return request<ImagingOrderView[]>(`/api/clinical-services${query.size ? `?${query}` : ''}`);
  },
  getOrder(orderId: string) {
    return request<ImagingOrderView>(`/api/clinical-services?orderId=${encodeURIComponent(orderId)}`);
  },
  createResult(input: ImagingResultInput) {
    return request<ImagingOrderView>('/api/clinical-services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
  updateResult(input: ImagingResultUpdateInput) {
    return request<ImagingOrderView>('/api/clinical-services', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  },
};
