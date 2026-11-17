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
export type Store = {
  insert: (m: Message) => Promise<void>;
  applyStatus: (id: string, status: Exclude<Status, 'sent'>, at: Date) => Promise<void>;
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
    close: () => client.close(),
  } satisfies Store & { close: () => Promise<void> };
}
