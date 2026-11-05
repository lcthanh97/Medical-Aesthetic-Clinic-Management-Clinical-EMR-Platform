import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

const connectionString = process.env.DATABASE_URL;

const pool = globalForPrisma.pool ?? new Pool({ 
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  // Fail fast when a sleeping/unreachable Neon compute cannot be resumed.
  // Pages can then render their safe empty states instead of hanging for 15s.
  connectionTimeoutMillis: 5000,
});
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}

export default prisma;
