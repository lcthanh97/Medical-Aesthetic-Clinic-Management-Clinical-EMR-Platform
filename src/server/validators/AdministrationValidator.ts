import { CreateAdministrationSchema } from '@/features/administration/schemas/administration.schema';
export class AdministrationValidator {
  static validateCreate(input: unknown) { return CreateAdministrationSchema.parse(input); }
}
