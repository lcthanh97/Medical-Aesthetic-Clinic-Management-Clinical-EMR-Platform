import { CreateAccountSchema, UpdateAccountSchema } from '@/features/auth/schemas/auth.schema';
export class AuthValidator {
  static validateCreate(input: unknown) { return CreateAccountSchema.parse(input); }
  static validateUpdate(input: unknown) { return UpdateAccountSchema.parse(input); }
}
