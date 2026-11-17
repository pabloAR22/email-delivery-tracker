import express from 'express';
import type { Sender } from './ses.ts';
import { STATUSES } from './events.ts';
import type { Filters, Store } from './store.ts';

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
    await store.insert({
      _id: messageId,
      to,
      subject,
      status: 'sent',
      sentAt: new Date(),
      events: [],
    });
    res.status(201).json({ messageId, status: 'sent' });
  });

  app.get('/emails/stats', async (_req, res) => {
    res.json(await store.counts());
  });

  app.get('/emails', async (req, res) => {
    const filters = parseFilters(req.query);
    if (!filters) {
      res.status(400).json({ error: 'filtros inválidos' });
      return;
    }
    res.json(await store.list(filters));
  });

  return app;
}

// Express entrega los query params como string o array: solo se aceptan strings.
function parseFilters(q: Record<string, unknown>): Filters | null {
  const str = (k: string) => (typeof q[k] === 'string' && q[k] ? (q[k] as string) : undefined);
  const date = (k: string) => (str(k) ? new Date(str(k)!) : undefined);
  const status = str('status');
  const limit = str('limit') ? Number(str('limit')) : 50;
  const since = date('since');
  const until = date('until');
  const bad =
    Object.values(q).some((v) => typeof v !== 'string') ||
    (status !== undefined && !(STATUSES as readonly string[]).includes(status)) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 200 ||
    [since, until].some((d) => d && isNaN(d.getTime()));
  return bad ? null : { status: status as Filters['status'], to: str('to'), since, until, limit };
}
