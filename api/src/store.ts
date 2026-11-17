import { MongoClient } from 'mongodb';
import { ALLOWED_FROM, type Status } from './events.ts';

export type Message = {
  _id: string; // MessageId de SES
  to: string;
  subject: string;
  status: Status;
  sentAt: Date;
  events: { type: Status; at: Date }[];
};
export type Filters = { status?: Status; to?: string; since?: Date; until?: Date; limit: number };
export type Counts = Record<Status, number>;

export type Store = {
  insert: (m: Message) => Promise<void>;
  applyStatus: (id: string, status: Exclude<Status, 'sent'>, at: Date) => Promise<void>;
  list: (f: Filters) => Promise<Message[]>;
  counts: () => Promise<Counts>;
};

export async function mongoStore(uri: string) {
  const client = await MongoClient.connect(uri);
  const messages = client.db().collection<Message>('messages');
  return {
    insert: async (m: Message) => void (await messages.insertOne(m)),
    // ponytail: un evento fuera de orden se descarta entero (también de `events`); guardar historial completo si el dashboard lo pide
    applyStatus: async (id, status, at) =>
      void (await messages.updateOne(
        { _id: id, status: { $in: ALLOWED_FROM[status] } },
        { $set: { status }, $push: { events: { type: status, at } } },
      )),
    list: async ({ status, to, since, until, limit }) =>
      // Documentos anteriores a la fase 3 no tienen `events`: se normaliza para no romper a los clientes.
      (
        await messages
          .find({
            ...(status && { status }),
            ...(to && { to: { $regex: to.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }),
            ...((since || until) && {
              sentAt: { ...(since && { $gte: since }), ...(until && { $lte: until }) },
            }),
          })
          .sort({ sentAt: -1 })
          .limit(limit)
          .toArray()
      ).map((m) => ({ ...m, events: m.events ?? [] })),
    counts: async () => {
      const counts: Counts = { sent: 0, delivered: 0, bounced: 0, opened: 0 };
      for await (const g of messages.aggregate<{ _id: Status; n: number }>([
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]))
        counts[g._id] = g.n;
      return counts;
    },
    close: () => client.close(),
  } satisfies Store & { close: () => Promise<void> };
}
