import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma loads this config for *all* CLI commands (including `prisma generate`).
    // Using `env('DATABASE_URL')` would throw if the variable is missing, so we read from `process.env`.
    url: process.env.DATABASE_URL!,
  },
});

