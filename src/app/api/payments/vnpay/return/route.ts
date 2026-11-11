import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryObj: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const result = await billingController.handleVNPayCallback(queryObj);

  const invoiceId =
    result.body.data?.invoice?.id ||
    (typeof queryObj.vnp_TxnRef === 'string' ? queryObj.vnp_TxnRef.split('_')[0] : '');
  const success = Boolean(result.body.success);
  const message =
    result.body.message ||
    (typeof result.body.error?.details === 'string' ? result.body.error.details : '');

  // Nếu backend xác nhận thanh toán hợp lệ -> Chuyển hướng trực tiếp đến trang Payment Success
  if (success && invoiceId) {
    const successUrl = new URL(`/letan/billing/${invoiceId}/success`, req.url);
    return NextResponse.redirect(successUrl);
  }

  // Nếu thất bại hoặc bị hủy -> Chuyển về trang danh sách với thông báo tương ứng
  const redirectUrl = new URL(
    `/letan/billing?payment=vnpay&success=false&invoiceId=${invoiceId}${message ? `&msg=${encodeURIComponent(message)}` : ''}`,
    req.url
  );

  return NextResponse.redirect(redirectUrl);
}

