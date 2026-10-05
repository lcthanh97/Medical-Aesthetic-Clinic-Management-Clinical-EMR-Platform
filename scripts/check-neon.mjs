import 'dotenv/config';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DIRECT_URL });
try {
  await client.connect();
  const connection = await client.query('select current_database() as database, current_user as role, version() as version');
  const tables = await client.query(`
    select tablename
    from pg_tables
    where schemaname = 'public'
    order by tablename
  `);
  const treatmentStepColumns = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'TreatmentStep'
    order by ordinal_position
  `);
  const affectedTables = [
    'TreatmentProtocolTemplate', 'ProtocolStageTemplate', 'ProtocolStepTemplate',
    'ProtocolStepMaterial', 'ProcedureCatalog', 'TreatmentPlan', 'TreatmentStage',
    'TreatmentStep', 'TreatmentSession', 'TreatmentImage', 'TreatmentConsumption',
    'InventoryTransaction', 'ActiveIngredient', 'MedicineIngredient',
    'IngredientInteraction', 'Medicine', 'Supply', 'EquipmentUsage', 'SignedConsent'
  ];
  const rowCounts = {};
  for (const table of affectedTables) {
    const result = await client.query(`select count(*)::int as count from "${table}"`);
    rowCounts[table] = result.rows[0].count;
  }
  const treatmentPlans = await client.query('select * from "TreatmentPlan" order by id');
  const treatmentStages = await client.query('select * from "TreatmentStage" order by "planId", "orderNo"');
  const treatmentSteps = await client.query('select * from "TreatmentStep" order by "stageId", "orderNo"');
  const planOwners = await client.query(`
    select p.id, v."patientId", v."employeeId"
    from "TreatmentPlan" p join "Visit" v on v.id = p."visitId"
    order by p.id
  `);
  const employees = await client.query('select id, "employeeCode", "fullName" from "Employee" order by id');
  console.log(JSON.stringify({
    ...connection.rows[0],
    tableCount: tables.rowCount,
    tables: tables.rows.map((row) => row.tablename),
    treatmentStepColumns: treatmentStepColumns.rows,
    rowCounts,
    treatmentPlans: treatmentPlans.rows,
    treatmentStages: treatmentStages.rows,
    treatmentSteps: treatmentSteps.rows,
    planOwners: planOwners.rows,
    employees: employees.rows,
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
