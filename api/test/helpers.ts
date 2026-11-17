import type { Message, Store } from '../src/store.ts';

export const fakeStore = (over: Partial<Store> = {}): Store => ({
  insert: async () => {},
  applyStatus: async () => {},
  list: async () => [],
  counts: async () => ({ sent: 0, delivered: 0, bounced: 0, opened: 0 }),
  ...over,
});

export const msg = (over: Partial<Message> = {}): Message => ({
  _id: 'm1',
  to: 'ana@example.com',
  subject: 'Hola',
  status: 'sent',
  sentAt: new Date('2026-11-16T10:00:00Z'),
  events: [],
  ...over,
});
