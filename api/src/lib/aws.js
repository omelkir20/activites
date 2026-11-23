import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

export function createAwsNotifier(env = process.env) {
  if (!env.SQS_QUEUE_URL && !env.S3_BUCKET) return null; // AWS désactivé

  const common = {
    region: env.AWS_REGION || 'us-east-1',
    endpoint: env.AWS_ENDPOINT_URL,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  };
  const sqs = new SQSClient(common);
  const s3 = new S3Client({ ...common, forcePathStyle: true }); // obligatoire avec Floci

  return {
    async publish(contact) {
      const payload = JSON.stringify({
        id: contact.id, name: contact.name, email: contact.email,
        message: contact.message, createdAt: contact.createdAt,
      });
      const jobs = [];
      if (env.SQS_QUEUE_URL) {
        jobs.push(sqs.send(new SendMessageCommand({
          QueueUrl: env.SQS_QUEUE_URL, MessageBody: payload,
        })));
      }
      if (env.S3_BUCKET) {
        jobs.push(s3.send(new PutObjectCommand({
          Bucket: env.S3_BUCKET, Key: `contacts/${contact.id}.json`,
          Body: payload, ContentType: 'application/json',
        })));
      }
      await Promise.all(jobs);
    },
  };
}
