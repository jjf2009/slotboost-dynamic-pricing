import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// For backward compatibility while refactoring
export const db = {
  query: async (text: string, params: any[]) => {
    console.warn("Using legacy db.query wrapper. Please migrate to Prisma.");
    return { rows: [], rowCount: 0 }; 
  }
};
