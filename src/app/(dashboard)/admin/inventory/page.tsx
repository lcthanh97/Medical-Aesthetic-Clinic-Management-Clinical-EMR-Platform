import { InventoryPanel } from '@/features/inventory/components/InventoryPanel';
import { getMedicines, getSupplies, getEquipments, getInventoryTransactions } from '@/features/inventory/actions';

export default async function AdminInventoryPage() {
  const [medRes, supRes, eqRes, txRes] = await Promise.all([
    getMedicines(),
    getSupplies(),
    getEquipments(),
    getInventoryTransactions(100)
  ]);

  const medicines = JSON.parse(JSON.stringify(medRes.success && medRes.data ? medRes.data : []));
  const supplies = JSON.parse(JSON.stringify(supRes.success && supRes.data ? supRes.data : []));
  const equipments = JSON.parse(JSON.stringify(eqRes.success && eqRes.data ? eqRes.data : []));
  const transactions = JSON.parse(JSON.stringify(txRes.success && txRes.data ? txRes.data : []));

  return (
    <main className="space-y-4">
      <div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          ⚙️ Phân hệ Quản trị & Vận hành
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Quản lý Kho & Thiết bị y tế</h1>
        <p className="text-sm text-gray-500">Quản lý danh mục thuốc, vật tư tiêu hao, máy móc điều trị da và nhật ký xuất nhập kho</p>
      </div>
      <InventoryPanel 
        medicines={medicines} 
        supplies={supplies} 
        equipments={equipments} 
        transactions={transactions}
      />
    </main>
  );
}
