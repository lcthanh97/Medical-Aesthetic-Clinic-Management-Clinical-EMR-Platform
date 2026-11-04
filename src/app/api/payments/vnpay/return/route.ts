import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryObj: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const result = await billingController.handleVNPayCallback(queryObj);

  // Chuyển hướng người dùng về trang billing với thông báo kết quả
  const invoiceId = result.body.data?.invoice?.id || '';
  const success = result.body.success;
  const redirectUrl = new URL(
    `/billing?payment=vnpay&success=${success}&invoiceId=${invoiceId}`,
    req.url
  );

  return NextResponse.redirect(redirectUrl);
}

