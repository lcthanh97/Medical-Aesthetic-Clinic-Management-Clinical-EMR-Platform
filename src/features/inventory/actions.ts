'use server';

import { PrismaInventoryRepository } from '@/infrastructure/database/repositories/PrismaInventoryRepository';
import { InventoryService } from '@/server/services/InventoryService';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { AuthService } from '@/server/services/AuthService';
import { PrismaAuthRepository } from '@/infrastructure/database/repositories/PrismaAuthRepository';
import type { TreatmentConsumptionReportFilters } from '@/server/repositories/IInventoryRepository';

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

const reportAuth = new AuthService(new PrismaAuthRepository());

function isLocalInventoryTestDatabase(): boolean {
  if (process.env.NODE_ENV === 'production' || !process.env.DATABASE_URL) return false;
  try {
    const url = new URL(process.env.DATABASE_URL);
    return ['localhost', '127.0.0.1'].includes(url.hostname)
      && url.port === '55432'
      && url.pathname === '/emr_test';
  } catch {
    return false;
  }
}

function parseReportFilters(input: unknown): TreatmentConsumptionReportFilters | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const boundedText = (value: unknown, max: number) =>
    value === undefined || value === '' ? undefined : typeof value === 'string' && value.length <= max ? value.trim() : null;
  const sessionId = boundedText(raw.sessionId, 128);
  const planId = boundedText(raw.planId, 128);
  const search = boundedText(raw.search, 100);
  const dateValue = (value: unknown, endOfDay = false) => {
    if (value === undefined || value === '') return undefined;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
      ? null
      : endOfDay ? `${value}T23:59:59.999Z` : date.toISOString();
  };
  const from = dateValue(raw.from);
  const to = dateValue(raw.to, true);
  const page = raw.page === undefined ? 0 : raw.page;
  if ([sessionId, planId, search, from, to].includes(null)
    || typeof page !== 'number' || !Number.isInteger(page) || page < 0 || page > 200) return null;
  if (typeof from === 'string' && typeof to === 'string' && from > to) return null;
  return {
    ...(typeof sessionId === 'string' ? { sessionId } : {}),
    ...(typeof planId === 'string' ? { planId } : {}),
    ...(typeof search === 'string' ? { search } : {}),
    ...(typeof from === 'string' ? { from } : {}),
    ...(typeof to === 'string' ? { to } : {}),
    page,
  };
}

/** Read-only INV-03 report. Access is intentionally limited to the isolated local test database
 * until the production permission matrix and approved environment are provided.
 */
export async function getTreatmentConsumptionReport(input: unknown) {
  if (!isLocalInventoryTestDatabase()) {
    return { success: false as const, error: 'Báo cáo tiêu hao hiện chỉ được bật trên PostgreSQL kiểm thử cô lập.' };
  }
  const filters = parseReportFilters(input);
  if (!filters) return { success: false as const, error: 'Bộ lọc báo cáo không hợp lệ.' };

  try {
    const cookieStore = await cookies();
    const actor = await reportAuth.getSession(cookieStore.get('clinic_session')?.value);
    if (!actor?.employeeId
      || !actor.rolePermissions.some(({ permissionCodes }) =>
        permissionCodes.includes('INVENTORY_READ') && permissionCodes.includes('TREATMENT_READ'))) {
      return { success: false as const, error: 'Không có quyền xem báo cáo trong phạm vi được phân công.' };
    }
    const data = await service.getTreatmentConsumptionReport({
      accountId: actor.accountId,
      employeeId: actor.employeeId,
      sessionId: actor.sessionId,
    }, filters);
    return {
      success: true as const,
      data: {
        ...data,
        rows: data.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      },
    };
  } catch {
    return { success: false as const, error: 'Không thể tải báo cáo tiêu hao lúc này.' };
  }
}
