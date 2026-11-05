import { z } from 'zod';
export const CreateAdministrationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('facility'), name: z.string().trim().min(2).max(120) }),
  z.object({ type: z.literal('department'), name: z.string().trim().min(2).max(120), facilityId: z.string().min(1) }),
  z.object({ type: z.literal('room'), name: z.string().trim().min(2).max(120), departmentId: z.string().min(1) }),
]);
