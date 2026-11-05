import { z } from 'zod';
export const AuthSchema = z.object({ id: z.string().optional() });
export const AuthLoginSchema = z.object({
  username: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(1024),
});
