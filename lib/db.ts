import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaClientSingleton = () => {
  const pool = new Pool({
    connectionString,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
};

export const prisma =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Temporary legacy compatibility layer
export const db = {
  query: async (_text: string, _params?: any[]) => {
    console.warn(
      'Using legacy db.query wrapper. Please migrate to Prisma.'
    );

    throw new Error(
      'Legacy db.query is deprecated and not implemented.'
    );
  },
};