import { NextResponse } from 'next/server';
import { getMedicines, getSupplies, getEquipments, getInventoryTransactions } from '@/features/inventory/actions';
export async function GET(){const [medicines,supplies,equipments,transactions]=await Promise.all([getMedicines(),getSupplies(),getEquipments(),getInventoryTransactions(100)]);return NextResponse.json({success:true,data:{medicines:medicines.data||[],supplies:supplies.data||[],equipments:equipments.data||[],transactions:transactions.data||[]}})}
