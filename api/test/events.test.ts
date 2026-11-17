import { expect, test } from 'vitest';
import { parseEvent, simulateEvents } from '../src/events.ts';

const body = (eventType: string) => JSON.stringify({ eventType, mail: { messageId: 'm1' } });

test('parseEvent traduce los tipos de SES', () => {
  expect(parseEvent(body('Delivery'))).toEqual({ messageId: 'm1', status: 'delivered' });
  expect(parseEvent(body('Bounce'))?.status).toBe('bounced');
  expect(parseEvent(body('Open'))?.status).toBe('opened');
});

test.each([body('Send'), 'no es json', '{"eventType":"Open"}'])('parseEvent ignora %s', (b) => {
  expect(parseEvent(b)).toBeNull();
});

test('simulateEvents decide por destinatario', () => {
  const types = (to: string) => simulateEvents(to, 'm1').map((b) => JSON.parse(b).eventType);
  expect(types('bounce@x.com')).toEqual(['Bounce']);
  expect(types('unopened@x.com')).toEqual(['Delivery']);
  expect(types('ana@x.com')).toEqual(['Delivery', 'Open']);
});
