import { CreateEmailIdentityCommand, SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export type Email = { to: string; subject: string; body: string };
export type Sender = (email: Email) => Promise<string>;

const ses = new SESv2Client({ disableHostPrefix: true });

// SES verifica el remitente. En el emulador la verificación llega con un pequeño retraso.
export async function ensureIdentity(from: string) {
  await ses.send(new CreateEmailIdentityCommand({ EmailIdentity: from })).catch((e) => {
    if (e.name !== 'AlreadyExistsException') throw e;
  });
}

export function sesSender(from: string): Sender {
  return async ({ to, subject, body }) => {
    for (let attempt = 1; ; attempt++) {
      try {
        const res = await ses.send(
          new SendEmailCommand({
            FromEmailAddress: from,
            Destination: { ToAddresses: [to] },
            Content: { Simple: { Subject: { Data: subject }, Body: { Text: { Data: body } } } },
          }),
        );
        return res.MessageId!;
      } catch (e) {
        // ponytail: reintento fijo de 5 x 200 ms; subir a backoff si SES real lo pide
        if ((e as Error).name !== 'MessageRejected' || attempt === 5) throw e;
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  };
}
