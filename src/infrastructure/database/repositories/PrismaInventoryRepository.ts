import type { 
  IInventoryRepository, 
  CompleteSessionDeductInventoryInput, 
  DeductInventoryResult 
} from '@/server/repositories/IInventoryRepository';
import { prisma } from '@/infrastructure/database/prisma';
import type { Prisma, Medicine, Supply, Equipment, EquipmentUsage } from '@prisma/client';

export class PrismaInventoryRepository implements IInventoryRepository {
  // Medicine
  async getMedicines(): Promise<Medicine[]> {
    return prisma.medicine.findMany({ orderBy: { name: 'asc' } });
  }

  async createMedicine(input: Prisma.MedicineUncheckedCreateInput): Promise<Medicine> {
    return prisma.medicine.create({ data: input });
  }

  async updateMedicine(id: string, input: Prisma.MedicineUpdateInput): Promise<Medicine> {
    return prisma.medicine.update({ where: { id }, data: input });
  }

  async deleteMedicine(id: string): Promise<Medicine> {
    return prisma.medicine.delete({ where: { id } });
  }

  // Supply
  async getSupplies(): Promise<Supply[]> {
    return prisma.supply.findMany({ orderBy: { name: 'asc' } });
  }

  async createSupply(input: Prisma.SupplyUncheckedCreateInput): Promise<Supply> {
    return prisma.supply.create({ data: input });
  }

  async updateSupply(id: string, input: Prisma.SupplyUpdateInput): Promise<Supply> {
    return prisma.supply.update({ where: { id }, data: input });
  }

  async deleteSupply(id: string): Promise<Supply> {
    return prisma.supply.delete({ where: { id } });
  }

  // Equipment
  async getEquipments(): Promise<Equipment[]> {
    return prisma.equipment.findMany({ orderBy: { name: 'asc' } });
  }

  async createEquipment(input: Prisma.EquipmentUncheckedCreateInput): Promise<Equipment> {
    return prisma.equipment.create({ data: input });
  }

  async updateEquipment(id: string, input: Prisma.EquipmentUpdateInput): Promise<Equipment> {
    return prisma.equipment.update({ where: { id }, data: input });
  }

  async deleteEquipment(id: string): Promise<Equipment> {
    return prisma.equipment.delete({ where: { id } });
  }

  // Equipment Usage
  async getEquipmentUsagesByEquipmentId(equipmentId: string): Promise<EquipmentUsage[]> {
    return prisma.equipmentUsage.findMany({
      where: { equipmentId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getEquipmentUsagesByVisitId(visitId: string): Promise<EquipmentUsage[]> {
    return prisma.equipmentUsage.findMany({
      where: { visitId },
      include: { equipment: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async createEquipmentUsage(input: Prisma.EquipmentUsageUncheckedCreateInput): Promise<EquipmentUsage> {
    return prisma.equipmentUsage.create({ data: input });
  }

  async updateEquipmentUsage(id: string, input: Prisma.EquipmentUsageUpdateInput): Promise<EquipmentUsage> {
    return prisma.equipmentUsage.update({ where: { id }, data: input });
  }

  async deleteEquipmentUsage(id: string): Promise<EquipmentUsage> {
    return prisma.equipmentUsage.delete({ where: { id } });
  }

  // Auto Deduct Inventory for Treatment
  async deductInventoryForTreatment(input: CompleteSessionDeductInventoryInput): Promise<DeductInventoryResult> {
    const { sessionId: providedSessionId, stepId, visitId, performedById, consumptions, notes } = input;

    if (!consumptions || consumptions.length === 0) {
      throw new Error('Danh sách thuốc/vật tư tiêu hao thực tế không được để trống.');
    }

    const runDeduct = async (tx: any) => {
      // 1. Resolve or create TreatmentSession
      let sessionId = providedSessionId;

      if (!sessionId && stepId) {
        const step = await tx.treatmentStep.findUnique({
          where: { id: stepId },
          include: {
            stage: {
              include: { plan: true }
            },
            sessions: true
          }
        });

        if (!step) {
          throw new Error(`Không tìm thấy bước điều trị ID: ${stepId}`);
        }

        let session = step.sessions.find((s: any) => s.status !== 'CANCELLED');
        if (!session) {
          const resolvedVisitId = visitId || step.stage.plan.visitId;
          session = await tx.treatmentSession.create({
            data: {
              stageId: step.stageId,
              stepId: step.id,
              visitId: resolvedVisitId,
              sessionNo: step.orderNo || 1,
              startedAt: new Date(),
              completedAt: new Date(),
              performedById: performedById,
              status: 'Hoàn thành'
            }
          });
        } else {
          session = await tx.treatmentSession.update({
            where: { id: session.id },
            data: {
              status: 'Hoàn thành',
              completedAt: new Date(),
              performedById: performedById
            }
          });
        }
        sessionId = session.id;

        // Cập nhật trạng thái bước sang Hoàn thành
        await tx.treatmentStep.update({
          where: { id: stepId },
          data: { status: 'Hoàn thành' }
        });
      } else if (sessionId) {
        await tx.treatmentSession.update({
          where: { id: sessionId },
          data: {
            status: 'Hoàn thành',
            completedAt: new Date(),
            performedById: performedById
          }
        });
      } else {
        throw new Error('Cần cung cấp sessionId hoặc stepId để xác định ca/bước điều trị.');
      }

      const createdTransactions: any[] = [];
      const createdConsumptions: any[] = [];

      // 2. Trừ tồn kho và lưu Transaction + Consumption
      for (const item of consumptions) {
        if (item.actualQuantity <= 0) {
          throw new Error(`Số lượng tiêu hao phải lớn hơn 0 cho mục ${item.itemId}`);
        }

        if (item.type === 'MEDICINE') {
          const medicine = await tx.medicine.findUnique({ where: { id: item.itemId } });
          if (!medicine) {
            throw new Error(`Không tìm thấy thuốc ID: ${item.itemId}`);
          }

          const currentStock = Number(medicine.stock);
          if (currentStock < item.actualQuantity) {
            throw new Error(`Thuốc "${medicine.name}" không đủ tồn kho để trừ. Hiện còn ${currentStock} ${medicine.unit}, yêu cầu ${item.actualQuantity} ${item.unit || medicine.unit}.`);
          }

          const balanceBefore = currentStock;
          const balanceAfter = currentStock - item.actualQuantity;

          // Cập nhật tồn kho thuốc
          await tx.medicine.update({
            where: { id: medicine.id },
            data: { stock: balanceAfter }
          });

          // Ghi nhận InventoryTransaction
          const txRecord = await tx.inventoryTransaction.create({
            data: {
              medicineId: medicine.id,
              transactionType: 'TREATMENT_USAGE',
              quantity: item.actualQuantity,
              unit: item.unit || medicine.unit,
              referenceType: 'TREATMENT_SESSION',
              referenceId: sessionId,
              balanceBefore,
              balanceAfter,
              createdById: performedById,
              notes: item.notes || notes || `Trừ kho thực tế theo ca điều trị #${sessionId}`
            }
          });

          // Ghi nhận TreatmentConsumption
          const unitCostNum = Number(medicine.unitCost) || 0;
          const totalCostNum = unitCostNum * item.actualQuantity;
          const consumption = await tx.treatmentConsumption.create({
            data: {
              sessionId: sessionId,
              medicineId: medicine.id,
              actualQuantity: item.actualQuantity,
              unit: item.unit || medicine.unit,
              unitCost: unitCostNum,
              totalCost: totalCostNum,
              recordedById: performedById
            }
          });

          createdTransactions.push({
            id: txRecord.id,
            type: 'MEDICINE',
            itemName: medicine.name,
            quantity: item.actualQuantity,
            unit: item.unit || medicine.unit,
            balanceBefore,
            balanceAfter
          });

          createdConsumptions.push({
            id: consumption.id,
            itemName: medicine.name,
            actualQuantity: item.actualQuantity,
            unit: item.unit || medicine.unit,
            unitCost: unitCostNum,
            totalCost: totalCostNum
          });

        } else if (item.type === 'SUPPLY') {
          const supply = await tx.supply.findUnique({ where: { id: item.itemId } });
          if (!supply) {
            throw new Error(`Không tìm thấy vật tư ID: ${item.itemId}`);
          }

          const currentStock = Number(supply.stock);
          if (currentStock < item.actualQuantity) {
            throw new Error(`Vật tư "${supply.name}" không đủ tồn kho để trừ. Hiện còn ${currentStock} ${supply.unit}, yêu cầu ${item.actualQuantity} ${item.unit || supply.unit}.`);
          }

          const balanceBefore = currentStock;
          const balanceAfter = currentStock - item.actualQuantity;

          // Cập nhật tồn kho vật tư
          await tx.supply.update({
            where: { id: supply.id },
            data: { stock: balanceAfter }
          });

          // Ghi nhận InventoryTransaction
          const txRecord = await tx.inventoryTransaction.create({
            data: {
              supplyId: supply.id,
              transactionType: 'TREATMENT_USAGE',
              quantity: item.actualQuantity,
              unit: item.unit || supply.unit,
              referenceType: 'TREATMENT_SESSION',
              referenceId: sessionId,
              balanceBefore,
              balanceAfter,
              createdById: performedById,
              notes: item.notes || notes || `Trừ kho thực tế theo ca điều trị #${sessionId}`
            }
          });

          // Ghi nhận TreatmentConsumption
          const unitCostNum = Number(supply.unitCost) || 0;
          const totalCostNum = unitCostNum * item.actualQuantity;
          const consumption = await tx.treatmentConsumption.create({
            data: {
              sessionId: sessionId,
              supplyId: supply.id,
              actualQuantity: item.actualQuantity,
              unit: item.unit || supply.unit,
              unitCost: unitCostNum,
              totalCost: totalCostNum,
              recordedById: performedById
            }
          });

          createdTransactions.push({
            id: txRecord.id,
            type: 'SUPPLY',
            itemName: supply.name,
            quantity: item.actualQuantity,
            unit: item.unit || supply.unit,
            balanceBefore,
            balanceAfter
          });

          createdConsumptions.push({
            id: consumption.id,
            itemName: supply.name,
            actualQuantity: item.actualQuantity,
            unit: item.unit || supply.unit,
            unitCost: unitCostNum,
            totalCost: totalCostNum
          });
        }
      }

      return {
        sessionId: sessionId as string,
        stepId,
        totalItemsDeducted: createdTransactions.length,
        transactions: createdTransactions,
        consumptions: createdConsumptions
      };
    };

    try {
      return await prisma.$transaction(async (tx) => {
        return await runDeduct(tx);
      }, {
        maxWait: 15000, // Tăng thời gian chờ kết nối lên 15 giây (do khoảng cách mạng tới Neon us-east-2)
        timeout: 30000  // Tăng thời gian chạy giao dịch lên 30 giây
      });
    } catch (err: any) {
      // Fallback an toàn nếu PgBouncer connection pooler bị nghẽn thời gian mở transaction
      if (err?.message?.includes('Unable to start a transaction') || err?.message?.includes('Transaction API error')) {
        console.warn('Interactive transaction timed out, executing deduction directly with prisma:', err.message);
        return await runDeduct(prisma);
      }
      throw err;
    }
  }

  async getInventoryTransactions(limit = 100): Promise<any[]> {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: {
        medicine: true,
        supply: true,
        createdBy: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return transactions.map(tx => ({
      ...tx,
      quantity: Number(tx.quantity),
      balanceBefore: Number(tx.balanceBefore),
      balanceAfter: Number(tx.balanceAfter),
      medicine: tx.medicine ? {
        ...tx.medicine,
        stock: Number(tx.medicine.stock),
        unitCost: Number(tx.medicine.unitCost),
        minStock: Number(tx.medicine.minStock)
      } : null,
      supply: tx.supply ? {
        ...tx.supply,
        stock: Number(tx.supply.stock),
        unitCost: Number(tx.supply.unitCost),
        minStock: Number(tx.supply.minStock)
      } : null
    }));
  }

  async getTreatmentConsumptionsBySessionId(sessionId: string): Promise<any[]> {
    const consumptions = await prisma.treatmentConsumption.findMany({
      where: { sessionId },
      include: {
        medicine: true,
        supply: true,
        recordedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return consumptions.map(c => ({
      ...c,
      plannedQuantity: c.plannedQuantity ? Number(c.plannedQuantity) : null,
      actualQuantity: Number(c.actualQuantity),
      unitCost: Number(c.unitCost),
      totalCost: Number(c.totalCost),
      medicine: c.medicine ? {
        ...c.medicine,
        stock: Number(c.medicine.stock),
        unitCost: Number(c.medicine.unitCost),
        minStock: Number(c.medicine.minStock)
      } : null,
      supply: c.supply ? {
        ...c.supply,
        stock: Number(c.supply.stock),
        unitCost: Number(c.supply.unitCost),
        minStock: Number(c.supply.minStock)
      } : null
    }));
  }
}
