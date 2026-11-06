import { NextRequest,NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';
export async function GET(req:NextRequest){const session=await getDoctorSession();if(!session)return NextResponse.json({success:false,error:'Chưa đăng nhập bác sĩ.'},{status:401});const visitId=req.nextUrl.searchParams.get('visitId');const data=await prisma.treatmentPlan.findMany({where:{createdById:session.employeeId,...(visitId?{visitId}:{})},include:{patient:true,createdBy:true,stages:{include:{steps:true,sessions:true},orderBy:{orderNo:'asc'}}},orderBy:{updatedAt:'desc'}});return NextResponse.json({success:true,data})}
