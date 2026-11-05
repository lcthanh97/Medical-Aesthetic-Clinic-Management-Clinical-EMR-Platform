import type { IAdministrationRepository } from '@/server/repositories/IAdministrationRepository';
import type { AdministrationSnapshot, CreateAdministrationInput } from '@/features/administration/types/administration.types';
import prisma from '@/infrastructure/database/prisma';
export class PrismaAdministrationRepository implements IAdministrationRepository {
  async getSnapshot(): Promise<AdministrationSnapshot> {
    const [facilities, departments, rooms, employees] = await Promise.all([
      prisma.clinicFacility.findMany({ orderBy: { name: 'asc' } }),
      prisma.department.findMany({ include: { facility: true }, orderBy: { name: 'asc' } }),
      prisma.room.findMany({ include: { department: true }, orderBy: { name: 'asc' } }),
      prisma.employee.findMany({ include: { department: true, account: true }, orderBy: { fullName: 'asc' } }),
    ]);
    return {
      facilities: facilities.map(x => ({ id: x.id, name: x.name })),
      departments: departments.map(x => ({ id: x.id, name: x.name, facilityId: x.facilityId, facilityName: x.facility.name })),
      rooms: rooms.map(x => ({ id: x.id, name: x.name, departmentId: x.departmentId, departmentName: x.department.name })),
      employees: employees.map(x => ({ id: x.id, employeeCode: x.employeeCode, fullName: x.fullName, departmentName: x.department?.name ?? null, accountUsername: x.account?.username ?? null })),
    };
  }
  async create(input: CreateAdministrationInput) {
    if (input.type === 'facility') return prisma.clinicFacility.create({ data: { name: input.name }, select: { id: true, name: true } });
    if (input.type === 'department') return prisma.department.create({ data: { name: input.name, facilityId: input.facilityId! }, select: { id: true, name: true } });
    return prisma.room.create({ data: { name: input.name, departmentId: input.departmentId! }, select: { id: true, name: true } });
  }
}
