import type { ApiResponse } from '@/types/api';
import type {
  WalkInVisitDto,
  VisitItem,
  VisitListQuery,
  VisitListResponse,
  QueueSummary,
  RoomQueueItem,
  TransferRoomDto,
  CancelVisitDto,
} from '../types/visits.types';

export const visitsApi = {
  async createWalkInVisit(data: WalkInVisitDto): Promise<ApiResponse<VisitItem>> {
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async getVisit(visitId: string): Promise<ApiResponse<VisitItem>> {
    const res = await fetch(`/api/visits/${visitId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getVisits(params?: VisitListQuery): Promise<ApiResponse<VisitListResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.roomId) searchParams.set('roomId', params.roomId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const res = await fetch(`/api/visits?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getQueue(params?: { roomId?: string; date?: string; status?: string }): Promise<ApiResponse<VisitItem[]>> {
    const searchParams = new URLSearchParams();
    if (params?.roomId) searchParams.set('roomId', params.roomId);
    if (params?.date) searchParams.set('date', params.date);
    if (params?.status) searchParams.set('status', params.status);

    const res = await fetch(`/api/visits/queue?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getQueueSummary(date?: string): Promise<ApiResponse<QueueSummary>> {
    const searchParams = new URLSearchParams();
    if (date) searchParams.set('date', date);

    const res = await fetch(`/api/visits/queue/summary?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async getRooms(): Promise<ApiResponse<RoomQueueItem[]>> {
    const res = await fetch('/api/rooms', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.json();
  },

  async transferRoom(visitId: string, data: TransferRoomDto): Promise<ApiResponse<VisitItem>> {
    const res = await fetch(`/api/visits/${visitId}/room`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async cancelVisit(visitId: string, data?: CancelVisitDto): Promise<ApiResponse<VisitItem>> {
    const res = await fetch(`/api/visits/${visitId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return res.json();
  },
};

