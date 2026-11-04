import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const { PrismaClient } = pkg;

let client;

// Client Prisma créé à la demande (singleton) : les tests unitaires n'ont pas besoin de base.
// Prisma 7 : la connexion passe par un driver adapter (pg).
export function getPrisma() {
  if (!client) {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    client = new PrismaClient({ adapter });
  }
  return client;
}

export function createContactRepository(prisma = getPrisma()) {
  return {
    create: ({ name, email, message }) =>
      prisma.contactMessage.create({
        data: { name, email, message },
        select: { id: true, createdAt: true },
      }),
  };
}
