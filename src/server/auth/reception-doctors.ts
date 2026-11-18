import 'server-only';
import prisma from '@/infrastructure/database/prisma';

export async function getReceptionDoctors(employeeId?: string) {
  const staff = await prisma.employee.findMany({
    where: { id: employeeId, account: { status: 'ACTIVE' } },
    select: { id: true, fullName: true, account: {
      select: { roles: { select: { role: { select: { name: true } } } } },
    } },
    orderBy: { fullName: 'asc' },
  });
  return staff.filter(({ account }) => account?.roles.some(({ role }) => {
    const name = role.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return name.includes('bac si') || name.includes('doctor');
  })).map(({ id, fullName }) => ({ id, fullName }));
}
