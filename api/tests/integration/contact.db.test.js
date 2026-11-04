// Tests d'intégration : (frontend ->) API -> PostgreSQL, avec une vraie base.
//  - API_URL      : URL de l'API       (défaut : app Express lancée en mémoire)
//  - FRONTEND_URL : si défini, les requêtes passent par Next.js (proxy /api) -> chaîne complète
//  - DATABASE_URL : base PostgreSQL utilisée pour vérifier les lignes insérées
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { createContactRepository, getPrisma } from '../../src/lib/prisma.js';

const target = process.env.FRONTEND_URL || process.env.API_URL;
const prisma = getPrisma();
const tag = `it-${Date.now()}`;
const agent = () => (target ? request(target) : request(createApp({
  contactRepo: createContactRepository(prisma),
  env: { CONTACT_RATE_LIMIT_MAX: '1000', RATE_LIMIT_MAX: '1000' },
})));

const body = (suffix = '') => ({
  name: `Test ${tag}${suffix}`.replace(/[^\p{L}0-9 .'-]/gu, ''),
  email: `${tag}${suffix}@example.com`,
  message: `Message d'intégration ${tag}${suffix} — chaîne complète.`,
});

beforeAll(async () => { await prisma.$connect(); });
afterAll(async () => {
  await prisma.contactMessage.deleteMany({ where: { email: { startsWith: tag } } });
  await prisma.$disconnect();
});

describe(`Intégration ${process.env.FRONTEND_URL ? 'frontend -> ' : ''}API -> PostgreSQL`, () => {
  it('POST /api/contact enregistre le message en base', async () => {
    const payload = body('a');
    const res = await agent().post('/api/contact').send(payload);
    expect(res.status).toBe(201);

    const row = await prisma.contactMessage.findUnique({ where: { id: res.body.data.id } });
    expect(row).toMatchObject({ email: payload.email.toLowerCase(), message: payload.message });
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('une injection SQL dans le message est stockée littéralement et la table survit', async () => {
    const payload = { ...body('b'), message: "x'); DROP TABLE contact_messages; -- ceci est un test" };
    const res = await agent().post('/api/contact').send(payload);
    expect(res.status).toBe(201);

    const row = await prisma.contactMessage.findUnique({ where: { id: res.body.data.id } });
    expect(row.message).toBe(payload.message);
    expect(await prisma.contactMessage.count()).toBeGreaterThan(0);
  });

  it('un message invalide est refusé et rien n\'est écrit en base', async () => {
    const before = await prisma.contactMessage.count();
    const res = await agent().post('/api/contact').send({ ...body('c'), email: 'invalide' });
    expect(res.status).toBe(400);
    expect(await prisma.contactMessage.count()).toBe(before);
  });
});
