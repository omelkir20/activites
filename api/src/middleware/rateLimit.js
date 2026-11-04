import rateLimit from 'express-rate-limit';

const handler = (_req, res) => {
  res.status(429).json({
    status: 'error',
    code: 'TOO_MANY_REQUESTS',
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
  });
};

const int = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

// Limite globale (toutes les routes /api)
export const createGlobalLimiter = (env = process.env) =>
  rateLimit({
    windowMs: int(env.RATE_LIMIT_WINDOW_MS, 60_000),
    limit: int(env.RATE_LIMIT_MAX, 100),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
  });

// Limite stricte pour POST /api/contact (route sensible : écriture en base)
export const createContactLimiter = (env = process.env) =>
  rateLimit({
    windowMs: int(env.CONTACT_RATE_LIMIT_WINDOW_MS, 60_000),
    limit: int(env.CONTACT_RATE_LIMIT_MAX, 5),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler,
  });
