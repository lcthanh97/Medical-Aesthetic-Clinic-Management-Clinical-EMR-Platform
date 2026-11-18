import crypto from 'crypto';

export interface VNPayConfig {
  tmnCode: string;
  hashSecret: string;
  paymentUrl: string;
  returnUrl: string;
}

function resolveReturnUrl(): string {
  const explicit = process.env.VNPAY_RETURN_URL?.trim();
  const isLocal = !!explicit && /localhost|127\.0\.0\.1/.test(explicit);
  // Trên Vercel không được dùng localhost làm Return URL.
  if (explicit && !(isLocal && process.env.VERCEL)) return explicit;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) return `https://${host}/api/payments/vnpay/return`;
  return 'http://localhost:3000/api/payments/vnpay/return';
}

export const VNPAY_CONFIG: VNPayConfig = {
  tmnCode: process.env.VNPAY_TMN_CODE?.trim() || '',
  hashSecret: process.env.VNPAY_HASH_SECRET?.trim() || '',
  paymentUrl: process.env.VNPAY_PAYMENT_URL?.trim() || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  returnUrl: resolveReturnUrl(),
};

export class VNPayService {
  /**
   * Tạo URL thanh toán VNPay Sandbox với chữ ký HMAC-SHA512 chuẩn.
   */
  static buildPaymentUrl(params: {
    invoiceId: string;
    amount: number; // VND
    orderInfo: string;
    ipAddr?: string;
    bankCode?: string;
    locale?: string;
    returnUrl?: string;
  }): { paymentUrl: string; txnRef: string } {
    if (!VNPAY_CONFIG.tmnCode || !VNPAY_CONFIG.hashSecret || !(params.returnUrl || VNPAY_CONFIG.returnUrl)) {
      throw new Error('VNPay chưa được cấu hình. Vui lòng bổ sung VNPAY_TMN_CODE, VNPAY_HASH_SECRET và VNPAY_RETURN_URL.');
    }
    const date = new Date();
    const createDate = this.formatDate(date);
    const expireDate = this.formatDate(new Date(date.getTime() + 15 * 60 * 1000));
    const txnRef = `${params.invoiceId}_${Date.now()}`;

    // Chuẩn hóa địa chỉ IP client sang định dạng IPv4 chuẩn
    let cleanIp = params.ipAddr ? params.ipAddr.split(',')[0].trim() : '127.0.0.1';
    if (cleanIp === '::1' || cleanIp.startsWith('::ffff:')) {
      cleanIp = '127.0.0.1';
    }

    const vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: VNPAY_CONFIG.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: params.orderInfo.slice(0, 255),
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(params.amount * 100)), // VNPay yêu cầu nhân 100
      vnp_ReturnUrl: params.returnUrl || VNPAY_CONFIG.returnUrl,
      vnp_IpAddr: cleanIp,
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDate,
    };

    if (params.bankCode && params.bankCode.trim() !== '') {
      vnpParams.vnp_BankCode = params.bankCode;
    }

    const signed = this.createSecureHash(vnpParams);
    const sortedParams = this.sortObject(vnpParams);
    const signData = new URLSearchParams(sortedParams).toString();

    const paymentUrl = `${VNPAY_CONFIG.paymentUrl}?${signData}&vnp_SecureHash=${signed}`;

    return {
      paymentUrl,
      txnRef,
    };
  }

  /**
   * Sinh mã băm HMAC-SHA512 cho tập tham số VNPay.
   */
  static createSecureHash(params: Record<string, string>): string {
    if (!VNPAY_CONFIG.hashSecret) throw new Error('VNPay chưa được cấu hình khóa ký.');
    const vnpParams: Record<string, string> = {};
    for (const key in params) {
      if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        vnpParams[key] = params[key];
      }
    }

    const sortedParams = this.sortObject(vnpParams);
    const signData = new URLSearchParams(sortedParams).toString();

    const hmac = crypto.createHmac('sha512', VNPAY_CONFIG.hashSecret);
    return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  }

  /**
   * Xác minh chữ ký phản hồi từ VNPay Sandbox (Return URL hoặc IPN Webhook).
   */
  static verifyReturnUrl(query: Record<string, string>): { isValid: boolean; invoiceId: string | null; responseCode: string } {
    const secureHash = query.vnp_SecureHash;
    const responseCode = query.vnp_ResponseCode || '';
    const txnRef = query.vnp_TxnRef || '';

    // Lấy invoiceId từ txnRef (được định dạng: `${invoiceId}_${timestamp}`)
    const invoiceId = txnRef.includes('_') ? txnRef.split('_')[0] : txnRef;

    const calculatedHash = this.createSecureHash(query);
    const isValid = Boolean(secureHash && calculatedHash.toLowerCase() === secureHash.toLowerCase());

    return {
      isValid,
      invoiceId: invoiceId || null,
      responseCode,
    };
  }

  private static sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  /**
   * VNPay yêu cầu yyyyMMddHHmmss theo giờ Việt Nam (GMT+7).
   * Không dùng getHours() vì server (Vercel) chạy UTC → giao dịch bị coi là hết hạn ngay.
   */
  private static formatDate(date: Date): string {
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = vn.getUTCFullYear();
    const MM = pad(vn.getUTCMonth() + 1);
    const dd = pad(vn.getUTCDate());
    const HH = pad(vn.getUTCHours());
    const mm = pad(vn.getUTCMinutes());
    const ss = pad(vn.getUTCSeconds());
    return `${yyyy}${MM}${dd}${HH}${mm}${ss}`;
  }
}
