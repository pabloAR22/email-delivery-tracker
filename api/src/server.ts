import { createApp } from './app.ts';
import { ensureIdentity, sesSender } from './ses.ts';
import { mongoStore } from './store.ts';

const from = process.env.SES_FROM ?? 'notifications@example.com';
const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/email-delivery-tracker';
const port = Number(process.env.PORT ?? 3000);

await ensureIdentity(from);
const app = createApp({ send: sesSender(from), store: await mongoStore(uri) });
app.listen(port, () => console.log(`api listening on :${port}`));
