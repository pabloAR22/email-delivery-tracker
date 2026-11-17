import {
  CreateQueueCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';

// useQueueUrlAsEndpoint: false, o el SDK llamaría al host real que devuelve el emulador.
const sqs = new SQSClient({ disableHostPrefix: true, useQueueUrlAsEndpoint: false });

export async function ensureQueue(name: string) {
  return (await sqs.send(new CreateQueueCommand({ QueueName: name }))).QueueUrl!;
}

export const publish = (QueueUrl: string, MessageBody: string) =>
  sqs.send(new SendMessageCommand({ QueueUrl, MessageBody }));

export async function receive(QueueUrl: string, signal?: AbortSignal) {
  const res = await sqs.send(
    new ReceiveMessageCommand({ QueueUrl, WaitTimeSeconds: 2, MaxNumberOfMessages: 10 }),
    { abortSignal: signal },
  );
  return res.Messages ?? [];
}

export const remove = (QueueUrl: string, ReceiptHandle: string) =>
  sqs.send(new DeleteMessageCommand({ QueueUrl, ReceiptHandle }));
