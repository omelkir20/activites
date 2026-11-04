import { AppError } from '../lib/errors.js';

// Valide req.body avec un schéma Zod ; remplace req.body par les données nettoyées.
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(body)',
      message: i.message,
    }));
    return next(new AppError(400, 'VALIDATION_ERROR', 'Données invalides', details));
  }
  req.body = result.data;
  next();
};
