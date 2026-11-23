import { describe, it, expect } from 'vitest';
import request from 'supertest';
import {
  SQSClient,
  ReceiveMessageCommand,
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

    let publishError;

    const realNotifier = createAwsNotifier(env);

    const notifier = {
      async publish(contact) {
        try {
          await realNotifier.publish(contact);
        } catch (error) {
          publishError = error;
          throw error;
        }
      },
    };

    const app = createApp({
      contactRepo: createContactRepository(),
      notifier,
      env,
    });

    const res = await request(app)
      .post('/api/contact')
      .send({
        name: 'Aws Test',
        email: 'aws@example.com',
        message: 'Message de test SQS Floci',
      });

    expect(res.status).toBe(201);

    // Vérifier directement la publication AWS
    expect(
      publishError,
      publishError?.stack || 'La publication SQS a échoué'
    ).toBeUndefined();

    const sqs = new SQSClient({
      region: env.AWS_REGION || 'us-east-1',
      endpoint: env.AWS_ENDPOINT_URL,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });

    let found = false;

    // Attendre la disponibilité du message dans Floci
    for (let i = 0; i < 10; i++) {
      const out = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL,
          WaitTimeSeconds: 2,
          MaxNumberOfMessages: 10,
        })
      );

      if (
        out.Messages?.some(message =>
          message.Body?.includes('aws@example.com')
        )
      ) {
        found = true;
        break;
      }
    }

    expect(
      found,
      'Aucun message contenant aws@example.com trouvé dans SQS'
    ).toBe(true);

    await sqs.destroy();
  });
});

