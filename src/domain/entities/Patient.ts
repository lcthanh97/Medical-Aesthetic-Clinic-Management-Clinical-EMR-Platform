import type { Allergy } from './Allergy';
import type { MedicalHistory } from './MedicalHistory';

export interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  allergies?: Allergy[];
  histories?: MedicalHistory[];
}
