import request from 'supertest';
import { expect, test } from 'vitest';
import { fakeStore, msg } from './helpers.ts';
import { createApp } from '../src/app.ts';
import type { Message } from '../src/store.ts';

const valid = { to: 'ana@example.com', subject: 'Hola', body: 'Texto' };

function setup(send = async () => 'msg-1') {
  const saved: Message[] = [];
  const app = createApp({
    send,
    store: fakeStore({ insert: async (m) => void saved.push(m) }),
  });
  return { app, saved };
}

test('POST /emails envía y guarda el mensaje como sent', async () => {
  const { app, saved } = setup();
  const res = await request(app).post('/emails').send(valid);
  expect(res.status).toBe(201);
  expect(res.body).toEqual({ messageId: 'msg-1', status: 'sent' });
  expect(saved).toMatchObject([
    { _id: 'msg-1', to: valid.to, subject: 'Hola', status: 'sent', events: [] },
  ]);
});

test.each([
  ['sin body', { ...valid, body: undefined }],
  ['correo inválido', { ...valid, to: 'no-es-correo' }],
  ['asunto vacío', { ...valid, subject: '  ' }],
])('POST /emails rechaza %s con 400', async (_name, payload) => {
  const { app, saved } = setup();
  const res = await request(app).post('/emails').send(payload);
  expect(res.status).toBe(400);
  expect(saved).toEqual([]);
});

test('POST /emails responde 502 y no guarda si SES falla', async () => {
  const { app, saved } = setup(async () => {
    throw new Error('boom');
  });
  const res = await request(app).post('/emails').send(valid);
  expect(res.status).toBe(502);
  expect(saved).toEqual([]);
});

test('GET /emails pasa los filtros al store', async () => {
  let received: unknown;
  const app = createApp({
    send: async () => 'x',
    store: fakeStore({
      list: async (f) => {
        received = f;
        return [msg()];
      },
    }),
  });
  const res = await request(app).get('/emails?status=bounced&to=ana&since=2026-11-01&limit=10');
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(received).toMatchObject({ status: 'bounced', to: 'ana', limit: 10 });
  expect((received as { since: Date }).since).toEqual(new Date('2026-11-01'));
});

test.each(['status=roto', 'limit=0', 'limit=9999', 'since=ayer', 'to=a&to=b'])(
  'GET /emails rechaza %s con 400',
  async (qs) => {
    const res = await request(createApp({ send: async () => 'x', store: fakeStore() })).get(
      `/emails?${qs}`,
    );
    expect(res.status).toBe(400);
  },
);

test('GET /emails/stats devuelve los conteos por estado', async () => {
  const counts = { sent: 1, delivered: 2, bounced: 3, opened: 4 };
  const app = createApp({
    send: async () => 'x',
    store: fakeStore({ counts: async () => counts }),
  });
  expect((await request(app).get('/emails/stats')).body).toEqual(counts);
});
