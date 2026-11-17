import { http, HttpResponse } from 'msw';
import { STATUSES, type Counts } from '../api';
import { messages } from './data';

export const handlers = [
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
