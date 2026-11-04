import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createContactRouter } from './routes/contact.js';
import { createContactLimiter, createGlobalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const profile = {
  name: 'Votre Nom',
  title: 'DevSecOps Engineer',
  email: 'contact@example.com',
  location: 'Tunis',
  bio: "Passionné par le DevSecOps et l'automatisation.",
};

const projects = [
  { id: 1, name: 'Portfolio', description: 'Site portfolio Next.js', tech: ['Next.js', 'Express'] },
  { id: 2, name: 'CI/CD Pipeline', description: 'Pipeline Jenkins', tech: ['Jenkins', 'Docker'] },
];

const skills = [
  { id: 1, name: 'Docker', level: 'Avancé' },
  { id: 2, name: 'Ansible', level: 'Intermédiaire' },
  { id: 3, name: 'Node.js', level: 'Avancé' },
];

export function createApp({ contactRepo, env = process.env } = {}) {
  const app = express();

  // L'API est derrière le proxy Next.js (rewrites) : on fait confiance à 1 saut pour l'IP client.
  app.set('trust proxy', Number(env.TRUST_PROXY ?? 1));

  app.use(helmet()); // headers HTTP de sécurité

  const origins = (env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(cors({ origin: origins, methods: ['GET', 'POST'] }));

  app.use(express.json({ limit: '10kb' }));
  app.use('/api', createGlobalLimiter(env));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });
  app.get('/api/profile', (_req, res) => res.json(profile));
  app.get('/api/projects', (_req, res) => res.json(projects));
  app.get('/api/skills', (_req, res) => res.json(skills));

  app.use('/api/contact', createContactRouter({ contactRepo, limiter: createContactLimiter(env) }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
