import type { Prisma, Medicine, Supply, Equipment, EquipmentUsage } from '@prisma/client';

export interface ConsumeItemInput {
  type: 'MEDICINE' | 'SUPPLY';
  itemId: string;
  actualQuantity: number;
  unit?: string;
  notes?: string;
}

export interface CompleteSessionDeductInventoryInput {
  sessionId?: string;
  stepId?: string;
  visitId?: string;
  performedById: string;
  consumptions: ConsumeItemInput[];
  notes?: string;
}

export interface DeductInventoryResult {
  sessionId: string;
  stepId?: string;
  totalItemsDeducted: number;
  transactions: Array<{
    id: string;
    type: 'MEDICINE' | 'SUPPLY';
    itemName: string;
    quantity: number;
    unit: string;
    balanceBefore: number;
    balanceAfter: number;
  }>;
  consumptions: Array<{
    id: string;
    itemName: string;
    actualQuantity: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }>;
}

export interface IInventoryRepository {
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
  getInventoryTransactions(limit?: number): Promise<any[]>;
  getTreatmentConsumptionsBySessionId(sessionId: string): Promise<any[]>;
}
