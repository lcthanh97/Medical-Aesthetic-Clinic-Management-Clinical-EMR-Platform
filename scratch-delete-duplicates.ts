import { prisma } from './src/infrastructure/database/prisma';

async function main() {
  const visits = await prisma.visit.findMany({
    include: {
      patient: true,
      treatmentPlans: true,
      orders: true,
      prescriptions: true,
      invoices: true,
      equipmentUsages: true,
      consents: true,
      medicalRecord: true
    },
    orderBy: {
      visitDate: 'asc'
    }
  });

  const seen = new Set();
  const toDelete = [];

  for (const visit of visits) {
    // Create a key using patientId and the date part of visitDate
    const dateStr = visit.visitDate.toISOString().split('T')[0];
    const key = `${visit.patientId}-${dateStr}`;
    
    if (seen.has(key)) {
      toDelete.push(visit);
    } else {
      seen.add(key);
    }
  }

  console.log(`Found ${toDelete.length} duplicate visits.`);

  for (const visit of toDelete) {
    // Delete related records first to satisfy foreign key constraints
    
    for (const plan of visit.treatmentPlans) {
      await prisma.treatmentStep.deleteMany({ where: { stage: { planId: plan.id } } });
    }
    await prisma.treatmentPlan.deleteMany({ where: { visitId: visit.id } });
    
    for (const order of visit.orders) {
      await prisma.labResult.deleteMany({ where: { orderId: order.id } });
      await prisma.imagingResult.deleteMany({ where: { orderId: order.id } });
    }
    await prisma.clinicalOrder.deleteMany({ where: { visitId: visit.id } });
    
    for (const p of visit.prescriptions) {
      await prisma.prescriptionItem.deleteMany({ where: { prescriptionId: p.id } });
    }
    await prisma.prescription.deleteMany({ where: { visitId: visit.id } });
    
    for (const inv of visit.invoices) {
      await prisma.payment.deleteMany({ where: { invoiceId: inv.id } });
    }
    await prisma.invoice.deleteMany({ where: { visitId: visit.id } });
    
    await prisma.equipmentUsage.deleteMany({ where: { visitId: visit.id } });
    await prisma.signedConsent.deleteMany({ where: { visitId: visit.id } });
    
    if (visit.medicalRecord) {
      await prisma.medicalRecord.delete({ where: { visitId: visit.id } });
    }

    // Finally delete the visit itself
    await prisma.visit.delete({ where: { id: visit.id } });
    console.log(`Deleted duplicate visit: ${visit.id} for patient ${visit.patient.fullName}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
