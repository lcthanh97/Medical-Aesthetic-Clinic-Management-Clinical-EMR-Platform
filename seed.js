require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  try {
    await pool.query(`
      INSERT INTO "Patient" (id, "patientCode", "fullName", "dateOfBirth", phone) 
      VALUES 
      ('test-patient-001', 'KH001', 'Trần Thị Mỹ Hạnh', '1995-05-20T00:00:00Z', '0912345678'),
      ('test-patient-002', 'KH002', 'Lê Hoàng Long', '1988-11-12T00:00:00Z', '0987654321')
      ON CONFLICT DO NOTHING
    `);
    console.log('Seeded successfully to Neon!');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
seed();
