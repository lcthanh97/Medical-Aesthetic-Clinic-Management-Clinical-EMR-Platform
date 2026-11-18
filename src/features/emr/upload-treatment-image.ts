const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 60_000;

export async function postTreatmentImage(form: FormData) {
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Hãy chọn tệp ảnh có dung lượng từ 1 byte đến 8 MB.');
  }

  const signal = AbortSignal.timeout(UPLOAD_TIMEOUT_MS);
  const response = await fetch('/api/doctor/treatment-images', {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
    signal,
  }).catch(() => {
    throw new Error(signal.aborted
      ? 'Chưa nhận được xác nhận lưu ảnh. Hãy tải lại danh sách ảnh trước khi gửi lại.'
      : 'Mất kết nối khi gửi ảnh. Hãy kiểm tra danh sách ảnh rồi thử lại.');
  });

  const payload = await response.json().catch(() => null);
  if (response.status === 413) throw new Error('Tệp ảnh vượt quá giới hạn tải lên.');
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' && payload.error
      ? payload.error
      : 'Không thể tải ảnh lên. Vui lòng thử lại.');
  }
  if (typeof payload?.data?.id !== 'string') {
    throw new Error('Chưa nhận được xác nhận lưu ảnh. Hãy tải lại danh sách ảnh trước khi gửi lại.');
  }
}
