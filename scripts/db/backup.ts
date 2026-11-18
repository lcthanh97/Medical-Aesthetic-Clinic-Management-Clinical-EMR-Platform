/**
 * Sao lưu toàn bộ dữ liệu (mọi bảng trong schema public) ra JSON.
 * Chạy: npx tsx scripts/db/backup.ts [thư-mục-đích]
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../../src/infrastructure/database/prisma';

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = process.argv[2] ?? join('backups', `db-${stamp}`);
  mkdirSync(dir, { recursive: true });
  const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`,
  );
  const summary: Record<string, number> = {};
  for (const { table_name } of tables) {
    const rows = await prisma.$queryRawUnsafe<unknown[]>(`select * from "${table_name}"`);
    writeFileSync(join(dir, `${table_name}.json`), JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
    summary[table_name] = rows.length;
  }
  writeFileSync(join(dir, '_summary.json'), JSON.stringify(summary, null, 2));
  console.log(`Đã sao lưu ${tables.length} bảng vào ${dir}`);
  console.table(summary);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
