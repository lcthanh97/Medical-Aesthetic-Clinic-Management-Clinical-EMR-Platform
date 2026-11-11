import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      VNPAY_TMN_CODE: 'MPYAWF14',
      VNPAY_HASH_SECRET: 'TEST_ONLY_SECRET_NOT_REAL_0123456789',
      VNPAY_RETURN_URL: 'http://localhost:3000/api/payments/vnpay/return',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
