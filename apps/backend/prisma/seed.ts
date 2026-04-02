import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing required environment variable: DATABASE_URL');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting production-safe database bootstrap...');

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.log('No SEED_ADMIN_EMAIL provided. Skipping bootstrap data creation.');
    console.log('No sample wallets, contracts, incidents, or market events were inserted.');
    return;
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      role: 'admin',
      plan: 'enterprise',
    },
    update: {
      role: 'admin',
      plan: 'enterprise',
    },
  });

  console.log(`Ensured admin bootstrap user exists for ${adminEmail}.`);
  console.log('No sample wallets, contracts, incidents, or market events were inserted.');
}

main()
  .catch((error) => {
    console.error('Error during bootstrap:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
    console.log('Disconnected from database');
  });
