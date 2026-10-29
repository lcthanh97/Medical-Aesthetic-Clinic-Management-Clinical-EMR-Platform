import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryService } from '../../../src/server/services/InventoryService';
import type { IInventoryRepository, CompleteSessionDeductInventoryInput, DeductInventoryResult } from '../../../src/server/repositories/IInventoryRepository';

describe('InventoryService - Trừ kho tự động theo ca điều trị', () => {
  let mockRepository: IInventoryRepository;
  let service: InventoryService;

  beforeEach(() => {
    mockRepository = {
      getMedicines: vi.fn(),
      createMedicine: vi.fn(),
      updateMedicine: vi.fn(),
      deleteMedicine: vi.fn(),
      getSupplies: vi.fn(),
      createSupply: vi.fn(),
      updateSupply: vi.fn(),
      deleteSupply: vi.fn(),
      getEquipments: vi.fn(),
      createEquipment: vi.fn(),
      updateEquipment: vi.fn(),
      deleteEquipment: vi.fn(),
      getEquipmentUsagesByEquipmentId: vi.fn(),
      getEquipmentUsagesByVisitId: vi.fn(),
      createEquipmentUsage: vi.fn(),
      updateEquipmentUsage: vi.fn(),
      deleteEquipmentUsage: vi.fn(),
      deductInventoryForTreatment: vi.fn(),
      getInventoryTransactions: vi.fn(),
      getTreatmentConsumptionsBySessionId: vi.fn(),
    };
    service = new InventoryService(mockRepository);
  });

  it('nên trừ kho thành công và trả về kết quả transaction + consumption', async () => {
    const input: CompleteSessionDeductInventoryInput = {
      sessionId: 'session-123',
      stepId: 'step-456',
      performedById: 'emp-001',
      consumptions: [
        {
          type: 'MEDICINE',
          itemId: 'med-1',
          actualQuantity: 5, // 5 ml
          unit: 'ml',
          notes: 'Tiêm meso 5ml'
        },
        {
          type: 'SUPPLY',
          itemId: 'sup-1',
          actualQuantity: 2, // 2 ống kim tiêm
          unit: 'cái'
        }
      ]
    };

    const mockResult: DeductInventoryResult = {
      sessionId: 'session-123',
      stepId: 'step-456',
      totalItemsDeducted: 2,
      transactions: [
        {
          id: 'tx-1',
          type: 'MEDICINE',
          itemName: 'Dung dịch Meso HA',
          quantity: 5,
          unit: 'ml',
          balanceBefore: 100,
          balanceAfter: 95
        },
        {
          id: 'tx-2',
          type: 'SUPPLY',
          itemName: 'Kim tiêm 34G',
          quantity: 2,
          unit: 'cái',
          balanceBefore: 50,
          balanceAfter: 48
        }
      ],
      consumptions: [
        {
          id: 'c-1',
          itemName: 'Dung dịch Meso HA',
          actualQuantity: 5,
          unit: 'ml',
          unitCost: 50000,
          totalCost: 250000
        },
        {
          id: 'c-2',
          itemName: 'Kim tiêm 34G',
          actualQuantity: 2,
          unit: 'cái',
          unitCost: 15000,
          totalCost: 30000
        }
      ]
    };

    vi.mocked(mockRepository.deductInventoryForTreatment).mockResolvedValue(mockResult);

    const result = await service.deductInventoryForTreatment(input);

    expect(mockRepository.deductInventoryForTreatment).toHaveBeenCalledWith(input);
    expect(result.totalItemsDeducted).toBe(2);
    expect(result.transactions[0].balanceAfter).toBe(95);
    expect(result.transactions[1].balanceAfter).toBe(48);
    expect(result.consumptions[0].totalCost).toBe(250000);
  });

  it('nên ném lỗi khi kho không đủ số lượng để trừ', async () => {
    const input: CompleteSessionDeductInventoryInput = {
      sessionId: 'session-123',
      performedById: 'emp-001',
      consumptions: [
        {
          type: 'MEDICINE',
          itemId: 'med-out-of-stock',
          actualQuantity: 200,
          unit: 'ml'
        }
      ]
    };

    vi.mocked(mockRepository.deductInventoryForTreatment).mockRejectedValue(
      new Error('Thuốc "Dung dịch Meso HA" không đủ tồn kho để trừ. Hiện còn 10 ml, yêu cầu 200 ml.')
    );

    await expect(service.deductInventoryForTreatment(input)).rejects.toThrow(
      'Thuốc "Dung dịch Meso HA" không đủ tồn kho để trừ'
    );
  });

  it('nên lấy danh sách giao dịch kho InventoryTransaction', async () => {
    const mockTxList = [
      {
        id: 'tx-1',
        transactionType: 'TREATMENT_USAGE',
        quantity: 5,
        unit: 'ml',
        balanceBefore: 100,
        balanceAfter: 95
      }
    ];

    vi.mocked(mockRepository.getInventoryTransactions).mockResolvedValue(mockTxList);

    const result = await service.getInventoryTransactions(10);
    expect(mockRepository.getInventoryTransactions).toHaveBeenCalledWith(10);
    expect(result).toHaveLength(1);
    expect(result[0].transactionType).toBe('TREATMENT_USAGE');
  });
});

