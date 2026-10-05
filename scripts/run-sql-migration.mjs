import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const migrationName = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

if (!migrationName) {
  throw new Error('Usage: node scripts/run-sql-migration.mjs <migration-name> [--dry-run]');
}

const migrationPath = new URL(`../prisma/migrations/${migrationName}/migration.sql`, import.meta.url);
const originalSql = await readFile(migrationPath, 'utf8');
const sql = originalSql
  .replace(/^\s*BEGIN;\s*/i, '')
  .replace(/\s*COMMIT;\s*$/i, '');
const checksum = createHash('sha256').update(originalSql).digest('hex');
const client = new pg.Client({ connectionString: process.env.DIRECT_URL });

try {
  await client.connect();
  const existing = await client.query(
    'select 1 from "_prisma_migrations" where "migration_name" = $1 and "rolled_back_at" is null',
    [migrationName],
  );
  if (existing.rowCount) {
    console.log(`${migrationName} is already applied.`);
    process.exit(0);
  }

  await client.query('BEGIN');
  await client.query(sql);

  if (dryRun) {
    await client.query('ROLLBACK');
    console.log(`${migrationName} passed transactional dry-run.`);
  } else {
    await client.query(
      `insert into "_prisma_migrations"
        ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
       values ($1, $2, now(), $3, null, null, now(), 1)`,
      [randomUUID(), checksum, migrationName],
    );
    await client.query('COMMIT');
    console.log(`${migrationName} applied successfully.`);
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
