import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';
dotenv.config();

const datasourceUrl = process.env.DIRECT_URL;

if (!datasourceUrl) {
  throw new Error('DATABASE_URL is required for Prisma commands');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: datasourceUrl,
  },
});
