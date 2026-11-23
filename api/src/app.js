import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { createContactRouter } from './routes/contact.js';
import {
  createContactLimiter,
  createGlobalLimiter
} from './middleware/rateLimit.js';

import {
  errorHandler,
  notFoundHandler
} from './middleware/errorHandler.js';

// Informations du profil
const profile = {
  name: 'Votre Nom',
  title: 'DevSecOps Engineer',
  email: 'contact@example.com',
  location: 'Tunis',
  bio: "Passionné par le DevSecOps et l'automatisation.",
};

// Projets
const projects = [
  {
    id: 1,
    name: 'Portfolio',
    description: 'Site portfolio Next.js',
    tech: ['Next.js', 'Express']
  },
  {
    id: 2,
    name: 'CI/CD Pipeline',
    description: 'Pipeline Jenkins',
    tech: ['Jenkins', 'Docker']
  },
];

// Compétences
const skills = [
  { id: 1, name: 'Docker', level: 'Avancé' },
  { id: 2, name: 'Ansible', level: 'Intermédiaire' },
  { id: 3, name: 'Node.js', level: 'Avancé' },
];

export function createApp({
  contactRepo,
  notifier,
  env = process.env
} = {}) {

  const app = express();

  // Configuration du proxy
  app.set('trust proxy', Number(env.TRUST_PROXY ?? 1));

  // Sécurité HTTP
  app.use(helmet());

  // Configuration CORS
  const origins = (env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(cors({
    origin: origins,
    methods: ['GET', 'POST']
  }));

  // Parsing JSON
  app.use(express.json({ limit: '10kb' }));

  // Limiteur global des requêtes
  app.use('/api', createGlobalLimiter(env));

  // Route de santé
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime()
    });
  });

  // Route profil
  app.get('/api/profile', (_req, res) => {
    res.json(profile);
  });

  // Route projets
  app.get('/api/projects', (_req, res) => {
    res.json(projects);
  });

  // Route compétences
  app.get('/api/skills', (_req, res) => {
    res.json(skills);
  });

  // Route contacts avec notification AWS
  app.use(
    '/api/contact',
    createContactRouter({
      contactRepo,
      notifier,
      limiter: createContactLimiter(env)
    })
  );

  // Gestion des routes inexistantes
  app.use(notFoundHandler);

  // Gestion globale des erreurs
  app.use(errorHandler);

  return app;
}
