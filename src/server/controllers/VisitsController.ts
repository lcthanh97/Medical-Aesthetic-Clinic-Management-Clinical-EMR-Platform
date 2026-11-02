import type { IVisitsService } from '@/server/services/IVisitsService';
import {
  createWalkInVisitSchema,
  transferRoomSchema,
  cancelVisitSchema,
  visitListQuerySchema,
} from '@/server/validators/VisitsValidator';
import { DomainError } from '@/domain/errors/DomainError';
import type { ApiResponse } from '@/types/api';

export class VisitsController {
  constructor(private readonly service: IVisitsService) {}

  async createWalkInVisit(body: unknown, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const validated = createWalkInVisitSchema.parse(body);
      const visit = await this.service.createWalkInVisit(validated, accountId);
      return {
        status: 201,
        body: {
          success: true,
          data: visit,
          message: `Đăng ký lượt khám thành công! Số thứ tự cấp: #${String(visit.queueNumber).padStart(2, '0')}`,
        },
      };
    } catch (error: any) {
      if (error instanceof DomainError) {
        return {
          status: 400,
          body: {
            success: false,
            message: error.message,
            error: { code: error.code },
          },
        };
      }
      return {
        status: 400,
        body: {
          success: false,
          message: error.errors ? error.errors[0]?.message : (error.message || 'Dữ liệu tiếp nhận không hợp lệ'),
          error: { code: 'VALIDATION_ERROR', details: error.errors },
        },
      };
    }
  }

  async getById(id: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const visit = await this.service.getById(id);
      return {
        status: 200,
        body: {
          success: true,
          data: visit,
        },
      };
    } catch (error: any) {
      const status = error instanceof DomainError && error.code === 'VISIT_NOT_FOUND' ? 404 : 400;
      return {
        status,
        body: {
          success: false,
          message: error.message || 'Không tìm thấy lượt khám',
          error: { code: error.code || 'GET_VISIT_ERROR' },
        },
      };
    }
  }

  async getList(query: unknown): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const validated = visitListQuerySchema.parse(query);
      const res = await this.service.getList(validated);
      return {
        status: 200,
        body: {
          success: true,
          data: res,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi lấy danh sách lượt khám',
          error: { code: 'LIST_VISIT_ERROR' },
        },
      };
    }
  }

  async getQueue(query: { roomId?: string; date?: string; status?: string }): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const queue = await this.service.getQueue(query.roomId, query.date, query.status);
      return {
        status: 200,
        body: {
          success: true,
          data: queue,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi tải hàng đợi',
          error: { code: 'QUEUE_ERROR' },
        },
      };
    }
  }

  async getQueueSummary(date?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const summary = await this.service.getQueueSummary(date);
      return {
        status: 200,
        body: {
          success: true,
          data: summary,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi thống kê hàng đợi',
          error: { code: 'QUEUE_SUMMARY_ERROR' },
        },
      };
    }
  }

  async getRooms(): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const rooms = await this.service.getRooms();
      return {
        status: 200,
        body: {
          success: true,
          data: rooms,
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi lấy danh sách phòng',
          error: { code: 'ROOMS_ERROR' },
        },
      };
    }
  }

  async transferRoom(visitId: string, body: unknown, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const validated = transferRoomSchema.parse(body);
      const updated = await this.service.transferRoom(visitId, validated, accountId);
      return {
        status: 200,
        body: {
          success: true,
          data: updated,
          message: 'Điều chuyển phòng khám thành công!',
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi điều chuyển phòng khám',
          error: { code: error.code || 'TRANSFER_ROOM_ERROR' },
        },
      };
    }
  }

  async cancelVisit(visitId: string, body: unknown, accountId?: string): Promise<{ status: number; body: ApiResponse<any> }> {
    try {
      const validated = cancelVisitSchema.parse(body || {});
      const cancelled = await this.service.cancelVisit(visitId, validated, accountId);
      return {
        status: 200,
        body: {
          success: true,
          data: cancelled,
          message: 'Đã hủy lượt khám thành công.',
        },
      };
    } catch (error: any) {
      return {
        status: 400,
        body: {
          success: false,
          message: error.message || 'Lỗi khi hủy lượt khám',
          error: { code: error.code || 'CANCEL_VISIT_ERROR' },
        },
      };
    }
  }
}

