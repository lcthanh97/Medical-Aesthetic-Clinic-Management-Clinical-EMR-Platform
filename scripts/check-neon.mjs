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
  console.log(JSON.stringify({
    ...connection.rows[0],
    tableCount: tables.rowCount,
    tables: tables.rows.map((row) => row.tablename),
  }));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
