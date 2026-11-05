import { ZodError } from 'zod';
import { DomainError } from '@/domain/errors/DomainError';
import type { IReceptionService } from '@/server/services/IReceptionService';
import { ReceptionValidator } from '@/server/validators/ReceptionValidator';
import type { ApiResponse } from '@/types/api';

export class ReceptionController {
  constructor(private readonly service: IReceptionService) {}

  private handleError(error: unknown): Response {
    if (error instanceof ZodError) {
      const response: ApiResponse<never> = {
        success: false,
        message: 'Dữ liệu không hợp lệ',
        error: {
          code: 'VALIDATION_ERROR',
          details: error.flatten().fieldErrors,
        },
      };
      return Response.json(response, { status: 400 });
    }

    if (error instanceof DomainError) {
      const status = error.code === 'PATIENT_NOT_FOUND' ? 404 : 400;
      const response: ApiResponse<never> = {
        success: false,
        message: error.message,
        error: {
          code: error.code,
        },
      };
      return Response.json(response, { status });
    }

    const message = error instanceof Error ? error.message : 'Lỗi hệ thống máy chủ nội bộ';
    const response: ApiResponse<never> = {
      success: false,
      message,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
    return Response.json(response, { status: 500 });
  }

  async listPatients(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const queryParams = {
        search: url.searchParams.get('search') ?? undefined,
        page: url.searchParams.get('page') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
      };

      const validated = ReceptionValidator.validateListQuery(queryParams);
      const result = await this.service.getList(validated);

      return Response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async createPatient(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const validated = ReceptionValidator.validateCreate(body);
      const result = await this.service.create(validated);

      return Response.json(
        {
          success: true,
          data: result,
          message: 'Tạo hồ sơ bệnh nhân thành công',
        },
        { status: 201 }
      );
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPatientDetail(id: string): Promise<Response> {
    try {
      if (!id) {
        return Response.json(
          {
            success: false,
            message: 'Mã định danh bệnh nhân không được để trống',
            error: { code: 'INVALID_ID' },
          },
          { status: 400 }
        );
      }

      const result = await this.service.getById(id);
      return Response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async updatePatient(id: string, request: Request): Promise<Response> {
    try {
      if (!id) {
        return Response.json(
          {
            success: false,
            message: 'Mã định danh bệnh nhân không được để trống',
            error: { code: 'INVALID_ID' },
          },
          { status: 400 }
        );
      }

      const body = await request.json();
      const validated = ReceptionValidator.validateUpdate(body);
      const result = await this.service.update(id, validated);

      return Response.json({
        success: true,
        data: result,
        message: 'Cập nhật hồ sơ bệnh nhân thành công',
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async checkDuplicate(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const queryParams = {
        phone: url.searchParams.get('phone') ?? undefined,
        fullName: url.searchParams.get('fullName') ?? undefined,
        dateOfBirth: url.searchParams.get('dateOfBirth') ?? undefined,
      };

      const validated = ReceptionValidator.validateDuplicateQuery(queryParams);
      const result = await this.service.checkDuplicate(validated);

      return Response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getPatientHistory(patientId: string): Promise<Response> {
    try {
      const result = await this.service.getPatientVisits(patientId);
      return Response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getStats(): Promise<Response> {
    try {
      const result = await this.service.getStats();
      return Response.json({
        success: true,
        data: result,
      });
    } catch (error) {
      return this.handleError(error);
    }
  }
}
