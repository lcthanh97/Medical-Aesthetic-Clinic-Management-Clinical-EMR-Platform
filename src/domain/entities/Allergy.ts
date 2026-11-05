export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction?: string | null;
  severity?: string | null;
}
