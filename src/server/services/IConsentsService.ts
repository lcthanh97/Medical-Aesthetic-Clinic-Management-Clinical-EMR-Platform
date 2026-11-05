import type { AuthActor } from '@/server/services/AuthService';
import type { DoctorConsentFilters } from '@/features/consents/schemas/consents.schema';
import type { DoctorConsentPage } from '@/server/repositories/IConsentsRepository';

export interface IConsentsService {
  getById(id:string):Promise<unknown|null>;
  getList():Promise<unknown[]>;
  getAssignedTreatmentConsents(actor: AuthActor, filters: DoctorConsentFilters): Promise<DoctorConsentPage>;
}
