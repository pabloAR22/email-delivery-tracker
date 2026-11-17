import request from 'supertest';
import { expect, test } from 'vitest';
import { createApp } from '../src/app.ts';
import type { Message } from '../src/store.ts';

const valid = { to: 'ana@example.com', subject: 'Hola', body: 'Texto' };

function setup(send = async () => 'msg-1') {
  const saved: Message[] = [];
  const app = createApp({ send, store: { insert: async (m) => void saved.push(m) } });
  return { app, saved };
}

test('POST /emails envía y guarda el mensaje como sent', async () => {
  const { app, saved } = setup();
  const res = await request(app).post('/emails').send(valid);
  expect(res.status).toBe(201);
  expect(res.body).toEqual({ messageId: 'msg-1', status: 'sent' });
  expect(saved).toMatchObject([{ _id: 'msg-1', to: valid.to, subject: 'Hola', status: 'sent' }]);
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
