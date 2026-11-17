import { MongoClient } from 'mongodb';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { type Message, mongoStore } from '../src/store.ts';

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
const base = (id: string): Message => ({
  _id: id,
  to: 'a@x.com',
  subject: 's',
  status: 'sent',
  sentAt: new Date(),
  events: [],
});
const seed = (id: string) => store.insert(base(id));

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

run('list filtra por estado y destinatario (con regex escapado) y counts agrupa', async () => {
  await store.insert({ ...base('l1'), to: 'ana.perez@x.com' });
  await store.insert({ ...base('l2'), to: 'anaXperez@x.com' });
  await store.applyStatus('l1', 'delivered', new Date());
  const lim = { limit: 50 };
  expect((await store.list({ ...lim, to: 'ana.perez' })).map((m) => m._id)).toEqual(['l1']);
  expect((await store.list({ ...lim, status: 'delivered' })).map((m) => m._id)).toContain('l1');
  expect((await store.list({ ...lim, until: new Date(0) })).length).toBe(0);
  const counts = await store.counts();
  expect(counts.delivered).toBeGreaterThanOrEqual(1);
});

run('list devuelve events vacío en documentos anteriores a la fase 3', async () => {
  await raw
    .db()
    .collection('messages')
    .insertOne({
      _id: 'old' as never,
      to: 'old@x.com',
      subject: 's',
      status: 'sent',
      sentAt: new Date(),
    });
  const [m] = await store.list({ limit: 1, to: 'old@x.com' });
  expect(m.events).toEqual([]);
});
