import { NextRequest,NextResponse } from 'next/server';
import prisma from '@/infrastructure/database/prisma';
export async function GET(req:NextRequest){const visitId=req.nextUrl.searchParams.get('visitId');const data=await prisma.treatmentPlan.findMany({where:visitId?{visitId}:undefined,include:{patient:true,createdBy:true,stages:{include:{steps:true,sessions:true},orderBy:{orderNo:'asc'}}},orderBy:{updatedAt:'desc'}});return NextResponse.json({success:true,data})}
