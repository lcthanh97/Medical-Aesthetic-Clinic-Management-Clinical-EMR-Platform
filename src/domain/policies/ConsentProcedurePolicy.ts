import { DomainError } from '@/domain/errors/DomainError';

export class ConsentProcedurePolicy {
  /**
   * Kiểm tra điều kiện dữ liệu chữ ký Canvas trước khi lưu (CON-02).
   * Đảm bảo nét vẽ hợp lệ, đúng định dạng Data URL và chặn canvas rỗng.
   */
  static ensureValidSignatureData(signatureDataUrl: string | undefined | null): void {
    if (!signatureDataUrl || typeof signatureDataUrl !== 'string') {
      throw new DomainError('Dữ liệu nét vẽ chữ ký không được để trống.', 'EMPTY_SIGNATURE');
    }

    // Kiểm tra định dạng ảnh chữ ký hợp lệ (PNG data URL hoặc Base64 hợp lệ)
    if (!signatureDataUrl.startsWith('data:image/png;base64,') && !signatureDataUrl.startsWith('data:image/')) {
      throw new DomainError('Định dạng ảnh chữ ký không hợp lệ (yêu cầu Data URL PNG).', 'INVALID_SIGNATURE_FORMAT');
    }

    // Chặn canvas rỗng (Data URL quá ngắn thường chỉ là header hoặc canvas trống không có nét vẽ)
    if (signatureDataUrl.length < 200) {
      throw new DomainError('Chữ ký không có nét vẽ hợp lệ (Canvas rỗng).', 'EMPTY_SIGNATURE_CANVAS');
    }
  }

  /**
   * Kiểm tra điều kiện cho phép chỉnh sửa trực tiếp biểu mẫu cam kết (CON-01):
   * Chỉ cho phép sửa đổi nội dung khi biểu mẫu chưa phát sinh bất kỳ bản cam kết đã ký nào.
   */
  static ensureCanEditTemplate(signedCount: number): void {
    if (signedCount > 0) {
      throw new DomainError(
        'Biểu mẫu này đã có bản cam kết được ký, không thể sửa trực tiếp. Vui lòng tạo phiên bản mới!',
        'TEMPLATE_ALREADY_USED'
      );
    }
  }
}
