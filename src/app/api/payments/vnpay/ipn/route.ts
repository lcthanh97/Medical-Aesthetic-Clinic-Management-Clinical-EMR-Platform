import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@/server/common/container';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const queryObj: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const result = await billingController.handleVNPayCallback(queryObj);

  if (result.status === 200) {
    return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
  } else {
    return NextResponse.json({ RspCode: '97', Message: 'Invalid Checksum or Transaction Failed' });
  }
}

