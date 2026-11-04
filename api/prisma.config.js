import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 : l'URL de connexion (migrations) est définie ici, plus dans schema.prisma
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
