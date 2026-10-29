import 'dotenv/config';
import { prisma } from './src/infrastructure/database/prisma';

async function main() {
  const patients = await prisma.patient.findMany({ take: 3 });
  const visits = await prisma.visit.findMany({ take: 3 });
  console.log('--- PATIENTS ---');
  console.log(JSON.stringify(patients, null, 2));
  console.log('\n--- VISITS ---');
  console.log(JSON.stringify(visits, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
