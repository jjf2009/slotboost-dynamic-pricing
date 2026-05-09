import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // In Prisma 7, connection management is preferred via the constructor if not using defaults
    // However, it will still pick up DATABASE_URL from process.env if present.
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// For backward compatibility while refactoring
export const db = {
  query: async (text: string, params: any[]) => {
    console.warn("Using legacy db.query wrapper. Please migrate to Prisma.");
    return { rows: [], rowCount: 0 }; 
  }
};
