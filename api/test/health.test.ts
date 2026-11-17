import request from 'supertest';
import { expect, test } from 'vitest';
import { createApp } from '../src/app.ts';

test('GET /health responde ok', async () => {
  const app = createApp({ send: async () => 'id', store: { insert: async () => {} } });
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ status: 'ok' });
});
