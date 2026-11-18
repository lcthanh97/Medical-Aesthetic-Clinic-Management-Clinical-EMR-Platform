import type { IInventoryRepository } from '@/server/repositories/IInventoryRepository';
import type { IInventoryService } from './IInventoryService';
import { Prisma } from '@prisma/client';
import type {
  InventoryReportActor,
  TreatmentConsumptionReportFilters,
} from '@/server/repositories/IInventoryRepository';

export class InventoryService implements IInventoryService {
  constructor(private readonly repository: IInventoryRepository) {}

  // Medicine
  getMedicines() { return this.repository.getMedicines(); }
  createMedicine(input: Prisma.MedicineUncheckedCreateInput) { return this.repository.createMedicine(input); }
  updateMedicine(id: string, input: Prisma.MedicineUpdateInput) { return this.repository.updateMedicine(id, input); }
  deleteMedicine(id: string) { return this.repository.deleteMedicine(id); }

  // Supply
  getSupplies() { return this.repository.getSupplies(); }
  createSupply(input: Prisma.SupplyUncheckedCreateInput) { return this.repository.createSupply(input); }
  updateSupply(id: string, input: Prisma.SupplyUpdateInput) { return this.repository.updateSupply(id, input); }
  deleteSupply(id: string) { return this.repository.deleteSupply(id); }

  // Equipment
  getEquipments() { return this.repository.getEquipments(); }
  createEquipment(input: Prisma.EquipmentUncheckedCreateInput) { return this.repository.createEquipment(input); }
  updateEquipment(id: string, input: Prisma.EquipmentUpdateInput) { return this.repository.updateEquipment(id, input); }
  deleteEquipment(id: string) { return this.repository.deleteEquipment(id); }

  // Equipment Usage
  getEquipmentUsagesByEquipmentId(equipmentId: string) { return this.repository.getEquipmentUsagesByEquipmentId(equipmentId); }
  getEquipmentUsagesByVisitId(visitId: string) { return this.repository.getEquipmentUsagesByVisitId(visitId); }
  createEquipmentUsage(input: Prisma.EquipmentUsageUncheckedCreateInput) { return this.repository.createEquipmentUsage(input); }
  updateEquipmentUsage(id: string, input: Prisma.EquipmentUsageUpdateInput) { return this.repository.updateEquipmentUsage(id, input); }
  deleteEquipmentUsage(id: string) { return this.repository.deleteEquipmentUsage(id); }

  // Auto Deduct Inventory for Treatment
  deductInventoryForTreatment(input: any) {
    return this.repository.deductInventoryForTreatment(input);
  }

  getInventoryTransactions(limit?: number) {
    return this.repository.getInventoryTransactions(limit);
  }

  getTreatmentConsumptionsBySessionId(sessionId: string) {
    return this.repository.getTreatmentConsumptionsBySessionId(sessionId);
  }

  async getTreatmentConsumptionReport(actor: InventoryReportActor, filters: TreatmentConsumptionReportFilters) {
    const report = await this.repository.getTreatmentConsumptionReport(actor, filters);
    return {
      ...report,
      rows: report.rows.map((row) => {
        if (row.plannedQuantity === null) {
          return { ...row, quantityVariance: null, variancePercent: null };
        }
        const planned = new Prisma.Decimal(row.plannedQuantity);
        if (planned.isZero()) {
          return { ...row, quantityVariance: null, variancePercent: null };
        }
        const actual = new Prisma.Decimal(row.actualQuantity);
        const variance = actual.minus(planned);
        return {
          ...row,
          quantityVariance: variance.toString(),
          variancePercent: variance.div(planned).mul(100).toString(),
        };
      }),
    };
  }
}
