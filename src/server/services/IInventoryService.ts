import type { Prisma, Medicine, Supply, Equipment, EquipmentUsage } from '@prisma/client';
import type { 
  CompleteSessionDeductInventoryInput, 
  DeductInventoryResult 
} from '@/server/repositories/IInventoryRepository';
import type {
  InventoryReportActor,
  TreatmentConsumptionReportData,
  TreatmentConsumptionReportFilters,
} from '@/server/repositories/IInventoryRepository';

export interface IInventoryService {
  // Medicine
  getMedicines(): Promise<Medicine[]>;
  createMedicine(input: Prisma.MedicineUncheckedCreateInput): Promise<Medicine>;
  updateMedicine(id: string, input: Prisma.MedicineUpdateInput): Promise<Medicine>;
  deleteMedicine(id: string): Promise<Medicine>;

  // Supply
  getSupplies(): Promise<Supply[]>;
  createSupply(input: Prisma.SupplyUncheckedCreateInput): Promise<Supply>;
  updateSupply(id: string, input: Prisma.SupplyUpdateInput): Promise<Supply>;
  deleteSupply(id: string): Promise<Supply>;

  // Equipment
  getEquipments(): Promise<Equipment[]>;
  createEquipment(input: Prisma.EquipmentUncheckedCreateInput): Promise<Equipment>;
  updateEquipment(id: string, input: Prisma.EquipmentUpdateInput): Promise<Equipment>;
  deleteEquipment(id: string): Promise<Equipment>;
  
  // Equipment Usage
  getEquipmentUsagesByEquipmentId(equipmentId: string): Promise<EquipmentUsage[]>;
  getEquipmentUsagesByVisitId(visitId: string): Promise<EquipmentUsage[]>;
  createEquipmentUsage(input: Prisma.EquipmentUsageUncheckedCreateInput): Promise<EquipmentUsage>;
  updateEquipmentUsage(id: string, input: Prisma.EquipmentUsageUpdateInput): Promise<EquipmentUsage>;
  deleteEquipmentUsage(id: string): Promise<EquipmentUsage>;

  // Auto Deduct Inventory for Treatment
  deductInventoryForTreatment(input: CompleteSessionDeductInventoryInput): Promise<DeductInventoryResult>;
  getTreatmentConsumptionReport(
    actor: InventoryReportActor,
    filters: TreatmentConsumptionReportFilters
  ): Promise<TreatmentConsumptionReportData>;
  getInventoryTransactions(limit?: number): Promise<any[]>;
  getTreatmentConsumptionsBySessionId(sessionId: string): Promise<any[]>;
}
