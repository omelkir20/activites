import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  SQSClient,
  ReceiveMessageCommand,
  ListQueuesCommand,
} from '@aws-sdk/client-sqs';

import { createApp } from '../../src/app.js';
import { createContactRepository } from '../../src/lib/prisma.js';
import { createAwsNotifier } from '../../src/lib/aws.js';

describe('API -> SQS (Floci)', () => {
  it('publie une notification après POST /api/contact', async () => {
    const env = {
      ...process.env,
      CONTACT_RATE_LIMIT_MAX: '1000',
      RATE_LIMIT_MAX: '1000',
    };

    console.log('========== CONFIGURATION AWS ==========');
    console.log('AWS_ENDPOINT_URL:', env.AWS_ENDPOINT_URL);
    console.log('SQS_QUEUE_URL:', env.SQS_QUEUE_URL);
    console.log('S3_BUCKET:', env.S3_BUCKET);

    let publishError;
    let publishCalled = false;

    const realNotifier = createAwsNotifier(env);

    expect(realNotifier, 'Le notifier AWS n’est pas configuré').not.toBeNull();

    // Intercepter l'appel au notifier pour vérifier son exécution
    const notifier = {
      async publish(contact) {
        publishCalled = true;

        console.log('========== NOTIFIER ==========');
        console.log('NOTIFIER APPELÉ AVEC:', contact.email);

        try {
          await realNotifier.publish(contact);
          console.log('PUBLICATION AWS TERMINÉE');
        } catch (error) {
          publishError = error;
          console.error('ERREUR PUBLICATION AWS:', error);
          throw error;
        }
      },
    };

    const app = createApp({
      contactRepo: createContactRepository(),
      notifier,
      env,
    });

    // Envoyer un contact à l'API
    const res = await request(app)
      .post('/api/contact')
      .send({
        name: 'Aws Test',
        email: 'aws@example.com',
        message: 'Message de test SQS Floci',
      });

    console.log('STATUT HTTP:', res.status);
    console.log('RÉPONSE API:', res.body);

    expect(res.status).toBe(201);

    // Vérifier que la route a appelé le notifier
    expect(
      publishCalled,
      'Le notifier n’a pas été appelé par la route API'
    ).toBe(true);

    // Vérifier qu'aucune erreur AWS n'a été interceptée
    expect(
      publishError,
      publishError?.stack || 'La publication SQS a échoué'
    ).toBeUndefined();

    // Créer le client SQS
    const sqs = new SQSClient({
      region: env.AWS_REGION || 'us-east-1',
      endpoint: env.AWS_ENDPOINT_URL,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });

    try {
      // Vérifier les files disponibles
      const queues = await sqs.send(
        new ListQueuesCommand({})
      );

      console.log('========== FILES SQS ==========');
      console.log('FILES SQS DISPONIBLES:', queues.QueueUrls);

      expect(
        queues.QueueUrls?.includes(env.SQS_QUEUE_URL),
        'La file SQS attendue est introuvable'
      ).toBe(true);

      // Rechercher le message envoyé
      let found = false;

      for (let i = 0; i < 10; i++) {
        console.log(`Tentative de réception SQS ${i + 1}/10`);

        const out = await sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: env.SQS_QUEUE_URL,
            WaitTimeSeconds: 2,
            MaxNumberOfMessages: 10,
          })
        );

        console.log(
          'MESSAGES REÇUS:',
          out.Messages?.map(message => message.Body) || []
        );

        if (
          out.Messages?.some(message =>
            message.Body?.includes('aws@example.com')
          )
        ) {
          found = true;
          console.log('MESSAGE aws@example.com TROUVÉ DANS SQS');
          break;
        }
      }

      expect(
        found,
        'Aucun message contenant aws@example.com trouvé dans SQS'
      ).toBe(true);
    } finally {
      await sqs.destroy();
    }
  });
});

