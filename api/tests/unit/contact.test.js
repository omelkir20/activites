import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

const validBody = {
  name: 'Ahmed Ben Ali',
  email: 'Ahmed@Example.com',
  message: 'Bonjour, je souhaite échanger sur un projet DevSecOps.',
};

let contactRepo;
const makeApp = (env = {}) => createApp({ contactRepo, env: { CONTACT_RATE_LIMIT_MAX: '1000', ...env } });

beforeEach(() => {
  contactRepo = { create: vi.fn().mockResolvedValue({ id: 1, createdAt: new Date('2026-01-01T00:00:00Z') }) };
});

describe('GET /api/health', () => {
  it('répond 200 { status: ok }', async () => {
    const res = await request(makeApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/contact', () => {
  it('crée un message valide (201) et normalise les données', async () => {
    const res = await request(makeApp()).post('/api/contact').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'success', data: { id: 1 } });
    expect(contactRepo.create).toHaveBeenCalledWith({
      name: 'Ahmed Ben Ali',
      email: 'ahmed@example.com',
      message: validBody.message,
    });
  });

  it('refuse un corps vide (400 VALIDATION_ERROR)', async () => {
    const res = await request(makeApp()).post('/api/contact').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(contactRepo.create).not.toHaveBeenCalled();
  });
});

describe('Sécurité : entrées invalides, injections, requêtes malformées', () => {
  const invalid = [
    ['email invalide', { ...validBody, email: 'pas-un-email' }, 'email'],
    ['nom trop court', { ...validBody, name: 'A' }, 'name'],
    ['message trop court', { ...validBody, message: 'court' }, 'message'],
    ['message trop long', { ...validBody, message: 'x'.repeat(2001) }, 'message'],
    ['nom non-string (objet NoSQL)', { ...validBody, name: { $ne: null } }, 'name'],
    ['email non-string (tableau)', { ...validBody, email: ['a@b.co'] }, 'email'],
    ['champ inconnu (mass assignment)', { ...validBody, isAdmin: true }, '(body)'],
    ['XSS dans le nom', { ...validBody, name: '<script>alert(1)</script>' }, 'name'],
    ['balise HTML dans le message', { ...validBody, message: 'Salut <img src=x onerror=alert(1)> !!' }, 'message'],
    ['injection SQL dans le nom', { ...validBody, name: "Robert'); DROP TABLE contact_messages;--" }, 'name'],
    ['injection SQL dans l\'email', { ...validBody, email: "a@b.co' OR '1'='1" }, 'email'],
  ];

  it.each(invalid)('refuse : %s', async (_label, body, field) => {
    const res = await request(makeApp()).post('/api/contact').send(body);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d) => d.field)).toContain(field);
    expect(contactRepo.create).not.toHaveBeenCalled();
  });

  it('une injection SQL dans le message est traitée comme du texte (jamais exécutée)', async () => {
    const message = "Salut'; DROP TABLE contact_messages; -- merci beaucoup";
    const res = await request(makeApp()).post('/api/contact').send({ ...validBody, message });
    expect(res.status).toBe(201);
    expect(contactRepo.create).toHaveBeenCalledWith(expect.objectContaining({ message }));
  });

  it('refuse un JSON malformé (400 INVALID_JSON)', async () => {
    const res = await request(makeApp())
      .post('/api/contact')
      .set('Content-Type', 'application/json')
      .send('{"name": "Ahmed", ');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  it('refuse un corps trop volumineux (413)', async () => {
    const res = await request(makeApp())
      .post('/api/contact')
      .send({ ...validBody, message: 'x'.repeat(20_000) });
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('refuse un Content-Type non JSON (400)', async () => {
    const res = await request(makeApp())
      .post('/api/contact')
      .set('Content-Type', 'text/plain')
      .send('name=Ahmed');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('ne divulgue pas de stack trace en cas d\'erreur interne (500)', async () => {
    contactRepo.create.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:5432 password=secret'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(makeApp()).post('/api/contact').send(validBody);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' });
    expect(JSON.stringify(res.body)).not.toMatch(/ECONNREFUSED|password/);
  });

  it('renvoie 404 JSON pour une route inconnue', async () => {
    const res = await request(makeApp()).get('/api/inconnue');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('Headers de sécurité (Helmet) et rate limiting', () => {
  it('ajoute les headers Helmet et masque X-Powered-By', async () => {
    const res = await request(makeApp()).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('renvoie 429 après dépassement de la limite sur POST /api/contact', async () => {
    const app = makeApp({ CONTACT_RATE_LIMIT_MAX: '3' });
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/contact').send(validBody)).status).toBe(201);
    }
    const res = await request(app).post('/api/contact').send(validBody);
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('TOO_MANY_REQUESTS');
    expect(res.headers['retry-after']).toBeDefined();
  });
});
