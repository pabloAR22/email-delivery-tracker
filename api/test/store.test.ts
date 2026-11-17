import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { mongoStore } from '../src/store.ts';

// Integración contra MongoDB real: se salta si no hay MONGODB_URI (CI y local la definen).
const uri = process.env.MONGODB_URI;
const run = test.skipIf(!uri);
let store: Awaited<ReturnType<typeof mongoStore>>;
let raw: MongoClient;
const dbUri = () => `${uri!.replace(/\/[^/]*$/, '')}/etd-test-${process.pid}`;

beforeAll(async () => {
  if (!uri) return;
  store = await mongoStore(dbUri());
  raw = await MongoClient.connect(dbUri());
});
afterAll(async () => {
  if (!uri) return;
  await raw.db().dropDatabase();
  await raw.close();
  await store.close();
});

const status = async (id: string) =>
  (
    await raw
      .db()
      .collection('messages')
      .findOne({ _id: id as never })
  )?.status;
const seed = (id: string) =>
  store.insert({
    _id: id,
    to: 'a@x.com',
    subject: 's',
    status: 'sent',
    sentAt: new Date(),
    events: [],
  });

run('sent -> delivered -> opened', async () => {
  await seed('a');
  await store.applyStatus('a', 'delivered', new Date());
  await store.applyStatus('a', 'opened', new Date());
  expect(await status('a')).toBe('opened');
});

run('un Delivery tardío no pisa un Open', async () => {
  await seed('b');
  await store.applyStatus('b', 'opened', new Date());
  await store.applyStatus('b', 'delivered', new Date());
  expect(await status('b')).toBe('opened');
});

run('un mensaje rebotado no se abre ni se entrega', async () => {
  await seed('c');
  await store.applyStatus('c', 'bounced', new Date());
  await store.applyStatus('c', 'delivered', new Date());
  await store.applyStatus('c', 'opened', new Date());
  expect(await status('c')).toBe('bounced');
});
