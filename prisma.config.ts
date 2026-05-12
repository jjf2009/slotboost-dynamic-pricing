// @ts-nocheck
import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  earlyAccess: true,
  migrations: {
    schemaPath: 'prisma/schema.prisma',
  },
  studio: {
    port: 5555,
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
