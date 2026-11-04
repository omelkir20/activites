import { Router } from 'express';
import { contactSchema } from '../schemas/contact.js';
import { validateBody } from '../middleware/validate.js';

export function createContactRouter({ contactRepo, limiter }) {
  const router = Router();

  router.post('/', limiter, validateBody(contactSchema), async (req, res) => {
    const saved = await contactRepo.create(req.body); // Express 5 : les rejets async vont à errorHandler
    res.status(201).json({
      status: 'success',
      message: 'Message enregistré, merci !',
      data: { id: saved.id, createdAt: saved.createdAt },
    });
  });

  return router;
}
