import { http, HttpResponse } from 'msw';
import { STATUSES, type Counts, type Message } from '../api';
import { messages, simulateEvents } from './data';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const handlers = [
  // Misma validación que la API real: 400 si falta algo o el correo es inválido.
  http.post('/emails', async ({ request }) => {
    const { to, subject, body } = (await request.json()) as Record<string, string>;
    if (!to || !EMAIL.test(to) || !subject?.trim() || !body?.trim())
      return HttpResponse.json(
        { error: 'to (email), subject y body son obligatorios' },
        { status: 400 },
      );
    const messageId = `msg-new-${messages.length + 1}`;
    const message: Message = {
      _id: messageId,
      to,
      subject,
      status: 'sent',
      sentAt: new Date().toISOString(),
      events: [],
    };
    messages.unshift(message);
    // Solo en la demo del navegador: imita al simulador de eventos de la API real.
    if (import.meta.env.VITE_DEMO) simulateEvents(message);
    return HttpResponse.json({ messageId, status: 'sent' }, { status: 201 });
  }),
  http.get('/emails/stats', () => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Counts;
    for (const m of messages) counts[m.status]++;
    return HttpResponse.json(counts);
  }),
  http.get('/emails', ({ request }) => {
    const q = new URL(request.url).searchParams;
    const status = q.get('status');
    const to = q.get('to')?.toLowerCase();
    const since = q.get('since');
    const until = q.get('until');
    const limit = Number(q.get('limit') ?? 50);
    return HttpResponse.json(
      messages
        .filter(
          (m) =>
            (!status || m.status === status) &&
            (!to || m.to.toLowerCase().includes(to)) &&
            (!since || m.sentAt >= new Date(since).toISOString()) &&
            (!until || m.sentAt <= new Date(until).toISOString()),
        )
        .slice(0, limit),
    );
  }),
];
