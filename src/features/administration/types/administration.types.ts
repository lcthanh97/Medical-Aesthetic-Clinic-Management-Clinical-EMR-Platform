export type AdministrationEntityType = 'facility' | 'department' | 'room';

export interface FacilityViewModel { id: string; name: string; }
export interface DepartmentViewModel { id: string; name: string; facilityId: string; facilityName: string; }
export interface RoomViewModel { id: string; name: string; departmentId: string; departmentName: string; }
export interface EmployeeAdministrationViewModel { id: string; employeeCode: string; fullName: string; departmentName: string | null; accountUsername: string | null; }
export interface AdministrationSnapshot {
  facilities: FacilityViewModel[];
  departments: DepartmentViewModel[];
  rooms: RoomViewModel[];
  employees: EmployeeAdministrationViewModel[];
}
export interface CreateAdministrationInput {
  type: AdministrationEntityType;
  name: string;
  facilityId?: string;
  departmentId?: string;
}
