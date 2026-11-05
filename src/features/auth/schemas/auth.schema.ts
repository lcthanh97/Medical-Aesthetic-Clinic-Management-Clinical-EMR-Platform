import { z } from 'zod';
export const CreateAccountSchema = z.object({
  username: z.string().trim().min(4).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().trim().email().optional(),
  password: z.string().min(8).max(128),
  roleIds: z.array(z.string().min(1)).max(10).default([]),
});
export const UpdateAccountSchema = z.object({
  id: z.string().min(1), email: z.string().trim().email().nullable().optional(),
  status: z.enum(['ACTIVE','LOCKED','DISABLED']).optional(), password: z.string().min(8).max(128).optional(),
  roleIds: z.array(z.string().min(1)).max(10).optional(),
});
