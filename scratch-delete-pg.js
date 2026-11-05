const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

async function main() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  await client.connect();

  console.log('Connected to database directly via pg.');

  try {
    // Begin transaction
    await client.query('BEGIN');

    // 1. Identify duplicates
    // We want to keep the FIRST visit for each patient on each date (min id)
    const duplicateQuery = `
      WITH RankedVisits AS (
        SELECT 
          id, 
          "patientId", 
          "visitDate"::date as visit_date,
          ROW_NUMBER() OVER(PARTITION BY "patientId", "visitDate"::date ORDER BY "visitDate" ASC, id ASC) as rn
        FROM "Visit"
      )
      SELECT id FROM RankedVisits WHERE rn > 1;
    `;
    
    const { rows: duplicateRows } = await client.query(duplicateQuery);
    const idsToDelete = duplicateRows.map(row => row.id);

    console.log(`Found ${idsToDelete.length} duplicate visits.`);

    if (idsToDelete.length === 0) {
      await client.query('COMMIT');
      return;
    }

    const idsStr = idsToDelete.map(id => `'${id}'`).join(',');

    // 2. Delete related records sequentially (Cascade is not enabled in schema)
    const deleteQueries = [
      `DELETE FROM "TreatmentStep" WHERE "planId" IN (SELECT id FROM "TreatmentPlan" WHERE "visitId" IN (${idsStr}))`,
      `DELETE FROM "TreatmentPlan" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "LabResult" WHERE "orderId" IN (SELECT id FROM "ClinicalOrder" WHERE "visitId" IN (${idsStr}))`,
      `DELETE FROM "ImagingResult" WHERE "orderId" IN (SELECT id FROM "ClinicalOrder" WHERE "visitId" IN (${idsStr}))`,
      `DELETE FROM "ClinicalOrder" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "PrescriptionItem" WHERE "prescriptionId" IN (SELECT id FROM "Prescription" WHERE "visitId" IN (${idsStr}))`,
      `DELETE FROM "Prescription" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "Payment" WHERE "invoiceId" IN (SELECT id FROM "Invoice" WHERE "visitId" IN (${idsStr}))`,
      `DELETE FROM "Invoice" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "EquipmentUsage" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "SignedConsent" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "MedicalRecord" WHERE "visitId" IN (${idsStr})`,
      `DELETE FROM "Visit" WHERE id IN (${idsStr})`
    ];

    for (const q of deleteQueries) {
      const res = await client.query(q);
      console.log(`Executed: ${q.substring(0, 50)}... -> Deleted ${res.rowCount} rows`);
    }

    await client.query('COMMIT');
    console.log('Successfully deleted duplicates and committed transaction.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Transaction failed, rolled back.', error);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
