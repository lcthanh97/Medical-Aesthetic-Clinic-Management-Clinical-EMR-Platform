const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding rule engine data...");

  // 1. Create Active Ingredients
  const vitaminC = await prisma.activeIngredient.upsert({
    where: { code: 'VIT_C' },
    update: {},
    create: { code: 'VIT_C', name: 'Vitamin C', description: 'Chống oxy hóa, làm sáng da' }
  });

  const retinol = await prisma.activeIngredient.upsert({
    where: { code: 'RETINOL' },
    update: {},
    create: { code: 'RETINOL', name: 'Retinol', description: 'Trẻ hóa, chống nhăn' }
  });

  const bha = await prisma.activeIngredient.upsert({
    where: { code: 'BHA' },
    update: {},
    create: { code: 'BHA', name: 'Salicylic Acid (BHA)', description: 'Tẩy tế bào chết' }
  });

  // 2. Create Medicines/Products
  const medA = await prisma.medicine.create({
    data: {
      name: 'Serum Vitamin C 20%',
      unit: 'Chai',
      ingredients: {
        create: [{ ingredientId: vitaminC.id, concentration: 20 }]
      }
    }
  });

  const medB = await prisma.medicine.create({
    data: {
      name: 'Kem chống nhăn Retinol 1%',
      unit: 'Tuýp',
      ingredients: {
        create: [{ ingredientId: retinol.id, concentration: 1 }]
      }
    }
  });

  const medC = await prisma.medicine.create({
    data: {
      name: 'Dung dịch tẩy da chết BHA 2%',
      unit: 'Chai',
      ingredients: {
        create: [{ ingredientId: bha.id, concentration: 2 }]
      }
    }
  });

  // 3. Create Interactions (Rules)
  // Retinol + Vitamin C -> High irritation
  await prisma.ingredientInteraction.create({
    data: {
      ingredientAId: retinol.id,
      ingredientBId: vitaminC.id,
      interactionType: 'IRRITATION',
      severity: 'HIGH',
      description: 'Kết hợp Retinol và Vitamin C có thể gây kích ứng da nghiêm trọng. Khuyên dùng Vitamin C buổi sáng và Retinol buổi tối.'
    }
  });

  // Retinol + BHA -> Extreme dryness and peeling
  await prisma.ingredientInteraction.create({
    data: {
      ingredientAId: retinol.id,
      ingredientBId: bha.id,
      interactionType: 'DRYNESS',
      severity: 'HIGH',
      description: 'Dùng chung Retinol và BHA dễ gây bong tróc, mẩn đỏ và khô da quá mức. Nên dùng luân phiên cách ngày.'
    }
  });

  console.log("Seeding rule engine data completed!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
