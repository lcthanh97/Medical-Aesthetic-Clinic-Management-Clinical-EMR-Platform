'use server';

import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import { InventoryService } from '@/server/services/InventoryService';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

const repository = new PrismaInventoryRepository();
const service = new InventoryService(repository);

// Medicine
export async function getMedicines() {
  try {
    const data = await service.getMedicines();
    const serializedData = data.map(item => ({
      ...item,
      stock: Number(item.stock),
      unitCost: Number(item.unitCost),
      minStock: Number(item.minStock)
    }));
    return { success: true, data: serializedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMedicine(input: Prisma.MedicineUncheckedCreateInput) {
  try {
    const data = await service.createMedicine(input);
    revalidatePath('/inventory');
    return { 
      success: true, 
      data: {
        ...data,
        stock: Number(data.stock),
        unitCost: Number(data.unitCost),
        minStock: Number(data.minStock)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateMedicine(id: string, input: Prisma.MedicineUpdateInput) {
  try {
    const data = await service.updateMedicine(id, input);
    revalidatePath('/inventory');
    return { 
      success: true, 
      data: {
        ...data,
        stock: Number(data.stock),
        unitCost: Number(data.unitCost),
        minStock: Number(data.minStock)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteMedicine(id: string) {
  try {
    await service.deleteMedicine(id);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Supply
export async function getSupplies() {
  try {
    const data = await service.getSupplies();
    const serializedData = data.map(item => ({
      ...item,
      stock: Number(item.stock),
      unitCost: Number(item.unitCost),
      minStock: Number(item.minStock)
    }));
    return { success: true, data: serializedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSupply(input: Prisma.SupplyUncheckedCreateInput) {
  try {
    const data = await service.createSupply(input);
    revalidatePath('/inventory');
    return { 
      success: true, 
      data: {
        ...data,
        stock: Number(data.stock),
        unitCost: Number(data.unitCost),
        minStock: Number(data.minStock)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSupply(id: string, input: Prisma.SupplyUpdateInput) {
  try {
    const data = await service.updateSupply(id, input);
    revalidatePath('/inventory');
    return { 
      success: true, 
      data: {
        ...data,
        stock: Number(data.stock),
        unitCost: Number(data.unitCost),
        minStock: Number(data.minStock)
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSupply(id: string) {
  try {
    await service.deleteSupply(id);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Equipment
export async function getEquipments() {
  try {
    const data = await service.getEquipments();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEquipment(input: Prisma.EquipmentUncheckedCreateInput) {
  try {
    const data = await service.createEquipment(input);
    revalidatePath('/inventory');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEquipment(id: string, input: Prisma.EquipmentUpdateInput) {
  try {
    const data = await service.updateEquipment(id, input);
    revalidatePath('/inventory');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEquipment(id: string) {
  try {
    await service.deleteEquipment(id);
    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Equipment Usage
export async function getEquipmentUsagesByVisitId(visitId: string) {
  try {
    const data = await service.getEquipmentUsagesByVisitId(visitId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEquipmentUsage(input: Prisma.EquipmentUsageUncheckedCreateInput) {
  try {
    const data = await service.createEquipmentUsage(input);
    revalidatePath('/treatments');
    revalidatePath('/bacsi/treatments');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEquipmentUsage(id: string, input: Prisma.EquipmentUsageUpdateInput) {
  try {
    const data = await service.updateEquipmentUsage(id, input);
    revalidatePath('/treatments');
    revalidatePath('/bacsi/treatments');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEquipmentUsage(id: string) {
  try {
    await service.deleteEquipmentUsage(id);
    revalidatePath('/treatments');
    revalidatePath('/bacsi/treatments');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Trừ kho tự động theo ca/bước điều trị (Treatment Inventory Deduction)
export async function deductInventoryForTreatment(input: any) {
  try {
    const data = await service.deductInventoryForTreatment(input);
    revalidatePath('/inventory');
    revalidatePath('/admin/inventory');
    revalidatePath('/treatments');
    revalidatePath('/bacsi/treatments');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getInventoryTransactions(limit = 100) {
  try {
    const data = await service.getInventoryTransactions(limit);
    const serializedData = data.map(tx => ({
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
    return { success: true, data: serializedData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getTreatmentConsumptionsBySessionId(sessionId: string) {
  try {
    const data = await service.getTreatmentConsumptionsBySessionId(sessionId);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}