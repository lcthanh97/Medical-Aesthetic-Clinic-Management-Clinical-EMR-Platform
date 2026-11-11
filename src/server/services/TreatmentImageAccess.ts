import { cookies } from 'next/headers';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import { prisma } from '@/infrastructure/database/prisma';
import { isDoctorReadEnvironment } from '@/server/policies/DoctorDatabaseAccess';
import { AuthService, type AuthActor } from '@/server/services/AuthService';

const authService = new AuthService(new PrismaAuthRepository());
const SESSION_COOKIE = 'clinic_session';

export type ImageAccessFailure = {
  success: false;
  code: 'UNAUTHENTICATED' | 'FORBIDDEN_PERMISSION' | 'FORBIDDEN_SCOPE' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'CONFLICT' | 'CONSENT_MISSING' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE' | 'STORAGE_NOT_CONFIGURED' | 'ENTITY_MISMATCH';
  message: string;
  trace: string[];
};

export type ImageAccessResult = { success: true; actor: AuthActor; trace: string[] } | ImageAccessFailure;

function fail(code: ImageAccessFailure['code'], message: string, trace: string[]): ImageAccessFailure {
  return { success: false, code, message, trace };
}

export async function authenticateTreatmentImageAction(requiredCodes: string[]): Promise<ImageAccessResult> {
  const trace = ['authenticate:START'];
  if (process.env.EMR_AUTHORIZATION_ENABLED !== 'true' || !isDoctorReadEnvironment()) {
    return fail('UNAUTHENTICATED', 'Phiên làm việc EMR chưa được bật.', [...trace, 'authenticate:FAIL']);
  }
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const actor = await authService.getSession(token);
  if (!actor || !actor.employeeId) return fail('UNAUTHENTICATED', 'Vui lòng đăng nhập lại.', [...trace, 'authenticate:FAIL']);
  trace.push('authenticate:OK');

  const permittedRoleNames = actor.rolePermissions
    .filter(({ permissionCodes }) => requiredCodes.every((code) => permissionCodes.includes(code)))
    .map(({ roleName }) => roleName);
  if (!permittedRoleNames.length) return fail('FORBIDDEN_PERMISSION', 'Tài khoản chưa được cấp quyền cho thao tác này.', [...trace, 'hasPermission:FAIL']);
  trace.push('hasPermission:OK');

  const now = new Date();
  const session = await prisma.refreshToken.findFirst({
    where: {
      id: actor.sessionId,
      accountId: actor.accountId,
      revokedAt: null,
      expiresAt: { gt: now },
      createdAt: { gt: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
      account: {
        is: {
          status: 'ACTIVE',
          employee: { is: { id: actor.employeeId } },
          roles: { some: { role: { is: { name: { in: permittedRoleNames } } } } },
        },
      },
    },
    select: { id: true },
  });
  if (!session) return fail('UNAUTHENTICATED', 'Phiên đăng nhập không còn hiệu lực.', [...trace, 'activeSession:FAIL']);
  trace.push('activeSession:OK');
  return { success: true, actor, trace };
}

export async function recordTreatmentImageAudit(input: {
  accountId?: string | null;
  action: string;
  entityId?: string | null;
  ipAddress?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        accountId: input.accountId ?? null,
        action: input.action,
        entity: 'TreatmentImage',
        entityId: input.entityId ?? null,
        ipAddress: input.ipAddress?.slice(0, 64) ?? null,
      },
    });
  } catch (error) {
    console.error('[emr-images] audit write failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
  }
}

export function imageFailure(code: ImageAccessFailure['code']): string {
  switch (code) {
    case 'UNAUTHENTICATED': return 'Vui lòng đăng nhập lại để tiếp tục.';
    case 'FORBIDDEN_PERMISSION': return 'Tài khoản chưa được cấp quyền cho thao tác này.';
    case 'FORBIDDEN_SCOPE': return 'Bệnh nhân hoặc lượt khám nằm ngoài phạm vi được phân công.';
    case 'NOT_FOUND': return 'Không tìm thấy ảnh trong phạm vi được phép.';
    case 'CONFLICT': return 'Dữ liệu đã được cập nhật ở nơi khác. Hãy tải lại rồi thử lại.';
    case 'CONSENT_MISSING': return 'Bệnh nhân chưa có đồng ý lưu ảnh lâm sàng. Vui lòng ghi nhận cam kết trước khi tải ảnh.';
    case 'INVALID_FILE_TYPE': return 'Chỉ chấp nhận tệp JPEG, PNG hoặc WebP hợp lệ.';
    case 'FILE_TOO_LARGE': return 'Tệp ảnh vượt quá giới hạn 10 MB.';
    case 'STORAGE_NOT_CONFIGURED': return 'Kho ảnh riêng tư chưa được cấu hình.';
    case 'ENTITY_MISMATCH': return 'Lượt khám, kế hoạch và buổi điều trị không khớp với bệnh nhân.';
    default: return 'Thông tin thao tác chưa hợp lệ.';
  }
}
