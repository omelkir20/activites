import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { createApp } from '../../src/app.js';
import { createContactRepository } from '../../src/lib/prisma.js';
import { createAwsNotifier } from '../../src/lib/aws.js';

describe('API -> SQS (Floci)', () => {
  it('publie une notification après POST /api/contact', async () => {
    const env = { ...process.env, CONTACT_RATE_LIMIT_MAX: '1000', RATE_LIMIT_MAX: '1000' };
    const app = createApp({ contactRepo: createContactRepository(), notifier: createAwsNotifier(env), env });
    const res = await request(app).post('/api/contact').send({
      name: 'Aws Test', email: 'aws@example.com', message: 'Message de test SQS Floci',
    });
    expect(res.status).toBe(201);

    const sqs = new SQSClient({ region: 'us-east-1', endpoint: env.AWS_ENDPOINT_URL,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
    const out = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: env.SQS_QUEUE_URL, WaitTimeSeconds: 5, MaxNumberOfMessages: 10 }));
    expect(out.Messages?.some(m => m.Body.includes('aws@example.com'))).toBe(true);
  });
});
