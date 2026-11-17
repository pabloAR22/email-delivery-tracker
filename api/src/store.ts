import { MongoClient } from 'mongodb';

export type Message = {
  _id: string; // MessageId de SES
  to: string;
  subject: string;
  status: 'sent';
  sentAt: Date;
};
export type Store = { insert: (m: Message) => Promise<void> };

export async function mongoStore(uri: string) {
  const client = await MongoClient.connect(uri);
  const messages = client.db().collection<Message>('messages');
  return {
    insert: async (m: Message) => void (await messages.insertOne(m)),
    close: () => client.close(),
  } satisfies Store & { close: () => Promise<void> };
}
