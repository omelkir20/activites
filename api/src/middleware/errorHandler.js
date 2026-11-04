import { AppError } from '../lib/errors.js';

export const notFoundHandler = (req, _res, next) =>
  next(new AppError(404, 'NOT_FOUND', `Route introuvable : ${req.method} ${req.path}`));

// Gestion centralisée des erreurs : un seul format de réponse, aucune fuite de stack trace.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Erreur interne du serveur';
  let details;

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'Corps de requête JSON malformé';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Corps de requête trop volumineux';
  } else if (err?.type === 'charset.unsupported' || err?.type === 'encoding.unsupported') {
    status = 415;
    code = 'UNSUPPORTED_ENCODING';
    message = 'Encodage non supporté';
  }

  if (status >= 500) {
    // le détail technique reste dans les logs serveur, jamais dans la réponse
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  const body = { status: 'error', code, message };
  if (details) body.details = details;
  res.status(status).json(body);
};
