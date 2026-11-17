import { expect, test } from 'vitest';
import { consumeOnce } from '../src/consumer.ts';
import { fakeStore } from './helpers.ts';

const ev = (eventType: string) => ({
  Body: JSON.stringify({ eventType, mail: { messageId: 'm1' } }),
  ReceiptHandle: eventType,
});

function setup(messages: { Body?: string; ReceiptHandle?: string }[], fail = false) {
  const applied: string[] = [];
  const removed: string[] = [];
  const store = fakeStore({
    applyStatus: async (_id, status) => {
      if (fail) throw new Error('mongo caído');
      applied.push(status);
    },
  });
  const queue = {
    receive: async () => messages,
    remove: async (h: string) => void removed.push(h),
  };
  return { store, queue, applied, removed };
}

test('aplica los eventos y los borra de la cola', async () => {
  const { store, queue, applied, removed } = setup([ev('Delivery'), ev('Open')]);
  await consumeOnce(queue, store);
  expect(applied).toEqual(['delivered', 'opened']);
  expect(removed).toEqual(['Delivery', 'Open']);
});

test('borra los mensajes que no son eventos de estado sin tocar el store', async () => {
  const { store, queue, applied, removed } = setup([ev('Send')]);
  await consumeOnce(queue, store);
  expect(applied).toEqual([]);
  expect(removed).toEqual(['Send']);
});

test('si el store falla no borra el mensaje (SQS lo reentrega)', async () => {
  const { store, queue, removed } = setup([ev('Delivery')], true);
  await expect(consumeOnce(queue, store)).rejects.toThrow('mongo caído');
  expect(removed).toEqual([]);
});
