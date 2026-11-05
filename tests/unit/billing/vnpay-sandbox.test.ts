import { beforeAll, describe, it, expect } from 'vitest';
import { VNPAY_CONFIG, VNPayService } from '../../../src/server/common/vnpay';

describe('BIL-02: VNPayService Sandbox Unit Tests', () => {
  beforeAll(() => {
    VNPAY_CONFIG.tmnCode = '2QXUI4B4';
    VNPAY_CONFIG.hashSecret = 'test-only-vnpay-signing-secret';
    VNPAY_CONFIG.paymentUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    VNPAY_CONFIG.returnUrl = 'http://localhost:3000/api/payments/vnpay/return';
  });
  it('1. Sinh URL thanh toán có đầy đủ các tham số VNPay và chữ ký HMAC-SHA512', () => {
    const { paymentUrl, txnRef } = VNPayService.buildPaymentUrl({
      invoiceId: 'inv-test-100',
      amount: 480000,
      orderInfo: 'Thanh toan hoa don y te inv-test-100',
      bankCode: 'NCB',
    });

    const url = new URL(paymentUrl);
    expect(url.origin + url.pathname).toBe('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    expect(url.searchParams.get('vnp_Amount')).toBe('48000000'); // x 100
    expect(url.searchParams.get('vnp_TmnCode')).toBe('2QXUI4B4');
    expect(url.searchParams.get('vnp_CurrCode')).toBe('VND');
    expect(url.searchParams.get('vnp_BankCode')).toBe('NCB');
    expect(url.searchParams.get('vnp_TxnRef')).toBe(txnRef);
    expect(url.searchParams.get('vnp_SecureHash')).toBeDefined();
    expect(url.searchParams.get('vnp_SecureHash')?.length).toBe(128); // SHA-512 hex length
  });

  it('2. Xác minh tính toàn vẹn của chữ ký callback (HMAC-SHA512 verification)', () => {
    const queryParams: Record<string, string> = {
      vnp_Amount: '15000000',
      vnp_BankCode: 'NCB',
      vnp_Command: 'pay',
      vnp_CreateDate: '20261104200000',
      vnp_CurrCode: 'VND',
      vnp_OrderInfo: 'Thanh toan tien kham',
      vnp_ResponseCode: '00',
      vnp_TmnCode: '2QXUI4B4',
      vnp_TxnRef: 'inv-test-200_1730720000000',
      vnp_Version: '2.1.0',
    };

    // Sinh hash chuẩn cho toàn bộ tham số phản hồi
    queryParams.vnp_SecureHash = VNPayService.createSecureHash(queryParams);

    const verification = VNPayService.verifyReturnUrl(queryParams);
    expect(verification.isValid).toBe(true);
    expect(verification.invoiceId).toBe('inv-test-200');
    expect(verification.responseCode).toBe('00');
  });

  it('3. Báo lỗi không hợp lệ nếu chữ ký callback bị sửa đổi hoặc giả mạo', () => {
    const queryParams: Record<string, string> = {
      vnp_Amount: '20000000',
      vnp_ResponseCode: '00',
      vnp_TxnRef: 'inv-test-300_1730720000000',
      vnp_SecureHash: 'correct_hash_placeholder',
    };

    queryParams.vnp_SecureHash = VNPayService.createSecureHash(queryParams);

    // Giả mạo đổi số tiền nhưng giữ nguyên hash
    queryParams.vnp_Amount = '99999999900';

    const verification = VNPayService.verifyReturnUrl(queryParams);
    expect(verification.isValid).toBe(false);
  });
});
