import { createApp } from './app.ts';
import { runConsumer } from './consumer.ts';
import { simulateEvents } from './events.ts';
import { ensureIdentity, sesSender } from './ses.ts';
import { ensureQueue, publish, receive, remove } from './sqs.ts';
import { mongoStore } from './store.ts';

const from = process.env.SES_FROM ?? 'notifications@example.com';
const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/email-delivery-tracker';
const port = Number(process.env.PORT ?? 3000);

await ensureIdentity(from);
const queueUrl = await ensureQueue(process.env.EVENTS_QUEUE ?? 'email-events');
const mongo = await mongoStore(uri);

// Simulador de eventos de SES: publica en la cola tras cada envío.
const send = sesSender(from);
const simulatedSend: typeof send = async (email) => {
  const messageId = await send(email);
  simulateEvents(email.to, messageId).forEach((body, i) =>
    setTimeout(() => publish(queueUrl, body).catch(console.error), 500 * (i + 1)),
  );
  return messageId;
};

const app = createApp({ send: simulatedSend, store: mongo });
const stop = new AbortController();
void runConsumer(
  { receive: (s) => receive(queueUrl, s), remove: (h) => remove(queueUrl, h) },
  mongo,
  stop.signal,
);
const server = app.listen(port, () => console.log(`api listening on :${port}`));
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => {
    stop.abort();
    server.close();
    await mongo.close(); // sin esto el proceso no termina
  });
}
