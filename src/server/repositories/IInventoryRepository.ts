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

export type TreatmentConsumptionReportFilters = {
  sessionId?: string;
  planId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
};

export type InventoryReportActor = { accountId: string; employeeId: string; sessionId: string };

export type TreatmentConsumptionReportRow = {
  id: string;
  sessionId: string;
  sessionNo: number;
  visitId: string;
  patientCode: string;
  patientName: string;
  planId: string;
  planName: string;
  medicineId: string | null;
  supplyId: string | null;
  itemType: 'MEDICINE' | 'SUPPLY';
  itemName: string;
  actualQuantity: string;
  plannedQuantity: string | null;
  quantityVariance: string | null;
  variancePercent: string | null;
  unit: string;
  unitCost: string;
  totalCost: string;
  recordedBy: string;
  createdAt: Date;
};

export type TreatmentConsumptionReportData = {
  rows: TreatmentConsumptionReportRow[];
  items: Array<{
    itemType: 'MEDICINE' | 'SUPPLY';
    itemId: string;
    itemName: string;
    unit: string;
    actualQuantity: string;
    totalCost: string;
    lineCount: number;
  }>;
  totalRows: number;
  totalActualQuantity: string;
  totalCost: string;
  page: number;
  pageSize: number;
};

export type TreatmentConsumptionRepositoryRow = Omit<
  TreatmentConsumptionReportRow,
  'quantityVariance' | 'variancePercent'
>;

export type TreatmentConsumptionRepositoryData = Omit<TreatmentConsumptionReportData, 'rows'> & {
  rows: TreatmentConsumptionRepositoryRow[];
};

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
  getTreatmentConsumptionReport(
    actor: InventoryReportActor,
    filters: TreatmentConsumptionReportFilters
  ): Promise<TreatmentConsumptionRepositoryData>;
  getInventoryTransactions(limit?: number): Promise<any[]>;
  getTreatmentConsumptionsBySessionId(sessionId: string): Promise<any[]>;
}
