import express from 'express';
import type { Sender } from './ses.ts';
import type { Store } from './store.ts';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max;

export function createApp({ send, store }: { send: Sender; store: Store }) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/emails', async (req, res) => {
    const { to, subject, body } = req.body ?? {};
    if (!text(to, 254) || !EMAIL.test(to) || !text(subject, 200) || !text(body, 10_000)) {
      res.status(400).json({ error: 'to (email), subject y body son obligatorios' });
      return;
    }
    let messageId: string;
    try {
      messageId = await send({ to, subject, body });
    } catch (e) {
      console.error('send failed', e);
      res.status(502).json({ error: 'no se pudo enviar el correo' });
      return;
    }
    await store.insert({ _id: messageId, to, subject, status: 'sent', sentAt: new Date() });
    res.status(201).json({ messageId, status: 'sent' });
  });

  return app;
}
