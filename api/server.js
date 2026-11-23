import 'dotenv/config';

import { createApp } from './src/app.js';
import { createContactRepository } from './src/lib/prisma.js';
import { createAwsNotifier } from './src/lib/aws.js';

// Initialisation des dépendances
const contactRepo = createContactRepository();
const notifier = createAwsNotifier();

// Création de l'application Express
const app = createApp({
  contactRepo,
  notifier
});

// Démarrage du serveur
const PORT = process.env.PORT || 4000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API démarrée sur http://0.0.0.0:${PORT}`);
});

