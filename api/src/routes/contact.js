import { Router } from 'express';
import { contactSchema } from '../schemas/contact.js';
import { validateBody } from '../middleware/validate.js';

export function createContactRouter({ contactRepo, limiter, notifier }) {
  const router = Router();

  router.post(
    '/',
    limiter,
    validateBody(contactSchema),
    async (req, res) => {
      // 1. Enregistrer le contact
      const saved = await contactRepo.create(req.body);

      // 2. Envoyer une notification AWS
      try {
        await notifier?.publish(saved);
      } catch (e) {
        console.error('Notification AWS échouée :', e.message);
      }

      // 3. Retourner la réponse
      return res.status(201).json({
        status: 'success',
        message: 'Message enregistré, merci !',
        data: {
          id: saved.id,
          createdAt: saved.createdAt
        }
      });
    }
  );

  return router;
}

