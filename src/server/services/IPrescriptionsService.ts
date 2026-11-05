import type { AuthActor } from '@/server/services/AuthService';
import type {
  PrescriptionListView,
  PrescriptionMedicineView,
  PrescriptionView,
  PrescriptionVisitView,
} from '@/features/prescriptions/schemas/prescriptions.schema';
import type { PrescriptionCreateInput, PrescriptionUpdateInput } from '@/features/prescriptions/schemas/prescriptions.schema';

export interface IPrescriptionsService {
  getList(actor: AuthActor, search?: string): Promise<PrescriptionListView>;
  getById(actor: AuthActor, id: string): Promise<PrescriptionView>;
  getAssignedVisits(actor: AuthActor, search?: string): Promise<PrescriptionVisitView[]>;
  getMedicines(actor: AuthActor, search?: string): Promise<PrescriptionMedicineView[]>;
  create(actor: AuthActor, input: PrescriptionCreateInput): Promise<PrescriptionView>;
  update(actor: AuthActor, id: string, input: PrescriptionUpdateInput): Promise<PrescriptionView>;
}
