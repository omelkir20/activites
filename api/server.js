import 'dotenv/config';
import { createApp } from './src/app.js';
import { createContactRepository } from './src/lib/prisma.js';

const PORT = process.env.PORT || 4000;

const app = createApp({ contactRepo: createContactRepository() });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API démarrée sur http://0.0.0.0:${PORT}`);
});
