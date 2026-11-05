import { AuditFiltersSchema } from '@/features/audit/schemas/audit.schema';
export class AuditValidator {
  static validateFilters(input: unknown) { return AuditFiltersSchema.parse(input); }
}
