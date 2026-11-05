import { NextRequest,NextResponse } from 'next/server';
import { administrationService, auditService } from '@/server/common/container';
import { AdministrationValidator } from '@/server/validators/AdministrationValidator';
export async function GET(){try{return NextResponse.json({success:true,data:await administrationService.getSnapshot()})}catch(e){return NextResponse.json({success:false,message:e instanceof Error?e.message:'Không thể tải cấu hình.'},{status:500})}}
export async function POST(req:NextRequest){try{const input=AdministrationValidator.validateCreate(await req.json());const data=await administrationService.create(input);await auditService.record({action:`CREATE_${input.type.toUpperCase()}`,entity:input.type,entityId:data.id,ipAddress:req.headers.get('x-forwarded-for')||undefined});return NextResponse.json({success:true,data},{status:201})}catch(e){return NextResponse.json({success:false,message:e instanceof Error?e.message:'Không thể lưu cấu hình.'},{status:400})}}
