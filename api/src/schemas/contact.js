import { z } from 'zod';

// Aucune balise HTML dans un texte brut (défense en profondeur contre le XSS stocké).
const noHtml = (v) => !/[<>]/.test(v);

export const contactSchema = z
  .object({
    name: z
      .string({ error: 'Le nom est obligatoire' })
      .trim()
      .min(2, 'Le nom doit contenir au moins 2 caractères')
      .max(100, 'Le nom ne doit pas dépasser 100 caractères')
      .regex(/^[\p{L}\p{M}0-9 .'’-]+$/u, 'Le nom contient des caractères non autorisés'),
    email: z
      .string({ error: "L'email est obligatoire" })
      .trim()
      .toLowerCase()
      .max(254, "L'email ne doit pas dépasser 254 caractères")
      .pipe(z.email("L'email est invalide")),
    message: z
      .string({ error: 'Le message est obligatoire' })
      .trim()
      .min(10, 'Le message doit contenir au moins 10 caractères')
      .max(2000, 'Le message ne doit pas dépasser 2000 caractères')
      .refine(noHtml, 'Le message ne doit pas contenir de balises HTML'),
  })
  // strict : tout champ inconnu est refusé (anti mass-assignment)
  .strict();
