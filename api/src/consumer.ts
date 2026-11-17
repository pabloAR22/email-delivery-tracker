import { parseEvent } from './events.ts';
import type { Store } from './store.ts';

type Queue = {
  receive: (signal?: AbortSignal) => Promise<{ Body?: string; ReceiptHandle?: string }[]>;
  remove: (receiptHandle: string) => Promise<unknown>;
};

// Procesa un lote: aplica los eventos y borra de la cola solo lo que se manejó bien.
// Si el store falla, el mensaje no se borra y SQS lo reentrega.
export async function consumeOnce(queue: Queue, store: Store, signal?: AbortSignal) {
  for (const m of await queue.receive(signal)) {
    const event = parseEvent(m.Body ?? '');
    if (event) await store.applyStatus(event.messageId, event.status, new Date());
    await queue.remove(m.ReceiptHandle!);
  }
}

export async function runConsumer(queue: Queue, store: Store, signal: AbortSignal) {
  while (!signal.aborted) {
    try {
      await consumeOnce(queue, store, signal);
    } catch (e) {
      if (signal.aborted) return;
      console.error('consumer error', e);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}
