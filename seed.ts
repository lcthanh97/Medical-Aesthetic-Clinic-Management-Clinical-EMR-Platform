import { prisma } from './src/infrastructure/database/prisma';

async function main() {
  const patient = await prisma.patient.create({
    data: {
      patientCode: 'P001',
      fullName: 'Nguyen Van Test',
      phone: '0901234567'
    }
  });
  console.log('Patient created:', patient);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
