import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/infrastructure/database/prisma';
import { getDoctorSession } from '@/server/auth/doctor-session';

const ACTIVE_VISIT_STATUSES = ['WAITING', 'REGISTERED', 'CHECKED_IN', 'IN_PROGRESS', 'EXAMINING', 'WAITING_RESULT', 'RESULT_READY'];
const itemsSchema = z.array(z.object({
  medicineId: z.string().trim().min(1),
  quantity: z.number().finite().positive().max(1000),
  dosage: z.string().trim().min(1).max(500),
}).strict()).min(1).max(20);
const requestSchema = z.object({
  mode: z.enum(['review', 'draft']),
  visitId: z.string().trim().min(1),
  items: itemsSchema,
  acknowledgedRisks: z.boolean().optional(),
}).strict();

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  const expectedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (!origin || !expectedHost) return false;
  try {
    const source = new URL(origin);
    const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    return source.host.toLowerCase() === expectedHost.toLowerCase() && (!protocol || source.protocol === `${protocol}:`);
  } catch { return false; }
}

function isDoctorRole(name: string) {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized.includes('bac si') || normalized.includes('doctor');
}

async function getAuthorizedDoctor() {
  const session = await getDoctorSession();
  if (!session) return null;
  const account = await prisma.account.findFirst({
    where: { id: session.accountId, status: 'ACTIVE', employee: { id: session.employeeId } },
    include: { roles: { include: { role: true } } },
  });
  return account?.roles.some(({ role }) => isDoctorRole(role.name)) ? session : null;
}

async function buildSafetyReview(visitId: string, medicineIds: string[]) {
  const visit = await prisma.visit.findUnique({ where: { id: visitId }, select: { id: true, patientId: true } });
  if (!visit) return null;
  const uniqueIds = [...new Set(medicineIds)];
  if (uniqueIds.length !== medicineIds.length) return { error: 'Không thêm trùng một thuốc nhiều lần trong cùng đơn.' as const };
  const [medicines, allergies, previousItems] = await Promise.all([
    prisma.medicine.findMany({
      where: { id: { in: uniqueIds }, status: 'ACTIVE' },
      select: { id: true, name: true, ingredients: { select: { ingredient: { select: { id: true, name: true } } } } },
    }),
    prisma.allergy.findMany({ where: { patientId: visit.patientId }, select: { substance: true, reaction: true, severity: true } }),
    prisma.prescriptionItem.findMany({
      where: { prescription: { status: 'PAID', visit: { patientId: visit.patientId, visitDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } } },
      select: {
        medicine: {
          select: { ingredients: { select: { ingredient: { select: { id: true, name: true } } } } },
        },
      },
    }),
  ]);
  if (medicines.length !== uniqueIds.length) return { error: 'Có thuốc không còn hoạt động hoặc không tồn tại trong danh mục.' as const };

  const newIngredients = medicines.flatMap((medicine) => medicine.ingredients.map(({ ingredient }) => ({ ...ingredient, medicineName: medicine.name })));
  const historicalIngredients = previousItems.flatMap((item) => item.medicine.ingredients.map(({ ingredient }) => ingredient));
  const newIngredientIds = [...new Set(newIngredients.map((item) => item.id))];
  const allIngredientIds = [...new Set([...newIngredientIds, ...historicalIngredients.map((item) => item.id)])];
  const interactions = newIngredientIds.length && allIngredientIds.length
    ? await prisma.ingredientInteraction.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { ingredientAId: { in: newIngredientIds }, ingredientBId: { in: allIngredientIds } },
          { ingredientBId: { in: newIngredientIds }, ingredientAId: { in: allIngredientIds } },
        ],
      },
      include: { ingredientA: { select: { name: true } }, ingredientB: { select: { name: true } } },
    })
    : [];

  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const warnings: Array<{ kind: 'ALLERGY' | 'INTERACTION'; severity: string; message: string }> = [];
  for (const allergy of allergies) {
    const needle = normalize(allergy.substance);
    const matches = medicines.some((medicine) => normalize(medicine.name).includes(needle) || medicine.ingredients.some(({ ingredient }) => normalize(ingredient.name).includes(needle) || needle.includes(normalize(ingredient.name))));
    if (needle && matches) warnings.push({ kind: 'ALLERGY', severity: allergy.severity || 'CAUTION', message: `Dị ứng đã ghi nhận: ${allergy.substance}${allergy.reaction ? ` · Phản ứng: ${allergy.reaction}` : ''}` });
  }
  const seen = new Set<string>();
  for (const interaction of interactions) {
    const key = [interaction.ingredientAId, interaction.ingredientBId].sort().join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    const hasNewA = newIngredientIds.includes(interaction.ingredientAId);
    const hasNewB = newIngredientIds.includes(interaction.ingredientBId);
    if (!hasNewA && !hasNewB) continue;
    if (interaction.ingredientAId === interaction.ingredientBId && !historicalIngredients.some(({ id }) => id === interaction.ingredientAId)) continue;
    warnings.push({ kind: 'INTERACTION', severity: interaction.severity, message: `${interaction.ingredientA.name} · ${interaction.ingredientB.name}: ${interaction.description}` });
  }
  return { warnings, allergyCount: allergies.length };
}

export async function GET(request: NextRequest) {
  try {
    const doctor = await getAuthorizedDoctor();
    if (!doctor) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const requestedVisitId = request.nextUrl.searchParams.get('visitId') || '';
    const visits = await prisma.visit.findMany({
      where: { employeeId: doctor.employeeId, status: { in: ACTIVE_VISIT_STATUSES } },
      select: {
        id: true, visitDate: true, status: true,
        patient: { select: { id: true, fullName: true, patientCode: true, allergies: { select: { substance: true, reaction: true, severity: true } } } },
        prescriptions: {
          where: { employeeId: doctor.employeeId },
          select: {
            id: true, status: true,
            items: {
              select: {
                id: true, medicineId: true, quantity: true, dosage: true,
                medicine: {
                  select: {
                    name: true, unit: true, stock: true, unitCost: true,
                    ingredients: { select: { ingredient: { select: { id: true, name: true } } } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { visitDate: 'desc' }, take: 200,
    });
    const selectedVisit = visits.find((visit) => visit.id === requestedVisitId) ?? visits[0] ?? null;
    if (requestedVisitId && !selectedVisit) return NextResponse.json({ error: 'Lượt khám không hoạt động hoặc không thuộc bác sĩ được phân công.' }, { status: 403 });
    const medicines = await prisma.medicine.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, unit: true, stock: true, unitCost: true, ingredients: { select: { ingredient: { select: { id: true, name: true } } } } }, orderBy: { name: 'asc' } });
    return NextResponse.json({ data: { visits, selectedVisitId: selectedVisit?.id ?? '', medicines } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải dữ liệu kê đơn.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: 'Yêu cầu kê đơn không cùng nguồn với ứng dụng.' }, { status: 403 });
    const doctor = await getAuthorizedDoctor();
    if (!doctor) return NextResponse.json({ error: 'Phiên bác sĩ không hợp lệ.' }, { status: 401 });
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: 'Thông tin đơn thuốc chưa hợp lệ.', details: parsed.error.flatten() }, { status: 400 });
    const { mode, visitId, items, acknowledgedRisks } = parsed.data;
    const visit = await prisma.visit.findFirst({ where: { id: visitId, employeeId: doctor.employeeId, status: { in: ACTIVE_VISIT_STATUSES } }, select: { id: true, patientId: true } });
    if (!visit) return NextResponse.json({ error: 'Lượt khám không hoạt động hoặc không thuộc bác sĩ được phân công.' }, { status: 403 });
    const review = await buildSafetyReview(visitId, items.map((item) => item.medicineId));
    if (!review) return NextResponse.json({ error: 'Không tìm thấy lượt khám.' }, { status: 404 });
    if ('error' in review) return NextResponse.json({ error: review.error }, { status: 400 });
    if (mode === 'review') return NextResponse.json({ data: review });
    if (review.warnings.length > 0 && acknowledgedRisks !== true) {
      return NextResponse.json({ error: 'Hãy rà soát và xác nhận đã đọc cảnh báo dị ứng/tương tác trước khi lưu đơn nháp.', data: review }, { status: 409 });
    }

    const prescription = await prisma.$transaction(async (tx) => {
      const currentVisit = await tx.visit.findFirst({ where: { id: visitId, employeeId: doctor.employeeId, status: { in: ACTIVE_VISIT_STATUSES } }, select: { id: true } });
      if (!currentVisit) throw new Error('Lượt khám đã thay đổi hoặc không còn được phân công cho bác sĩ hiện tại.');
      const currentMedicines = await tx.medicine.findMany({ where: { id: { in: items.map((item) => item.medicineId) }, status: 'ACTIVE' }, select: { id: true } });
      if (currentMedicines.length !== items.length) throw new Error('Danh mục thuốc đã thay đổi. Hãy tải lại trước khi lưu.');
      return tx.prescription.create({
        data: {
          visitId, employeeId: doctor.employeeId, status: 'DRAFT',
          items: { create: items.map((item) => ({ medicineId: item.medicineId, quantity: item.quantity, dosage: item.dosage })) },
        },
        select: { id: true, status: true, visitId: true, items: { select: { id: true, medicineId: true, quantity: true, dosage: true, medicine: { select: { name: true, unit: true } } } } },
      });
    });
    return NextResponse.json({ data: { prescription, safetyReview: review, inventoryChanged: false } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể lưu đơn thuốc nháp.' }, { status: 400 });
  }
}
