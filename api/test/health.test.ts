import request from 'supertest';
import { expect, test } from 'vitest';
import { fakeStore } from './helpers.ts';
import { createApp } from '../src/app.ts';

test('GET /health responde ok', async () => {
  const app = createApp({
    send: async () => 'id',
    store: fakeStore(),
  });
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});
