export const STATUSES = ['sent', 'delivered', 'bounced', 'opened'] as const;
export type Status = (typeof STATUSES)[number];

// Estados desde los que se acepta cada transición. SQS estándar no garantiza orden:
// un Delivery tardío no debe pisar un Open ya registrado.
export const ALLOWED_FROM: Record<Exclude<Status, 'sent'>, Status[]> = {
  delivered: ['sent'],
  bounced: ['sent'],
  opened: ['sent', 'delivered'],
};

const TYPES = { Delivery: 'delivered', Bounce: 'bounced', Open: 'opened' } as const;

export type StatusEvent = { messageId: string; status: Exclude<Status, 'sent'> };

// Formato de los eventos de SES: { eventType, mail: { messageId } }. Otros tipos se ignoran.
export function parseEvent(body: string): StatusEvent | null {
  try {
    const { eventType, mail } = JSON.parse(body);
    const status = TYPES[eventType as keyof typeof TYPES];
    return status && typeof mail?.messageId === 'string'
      ? { messageId: mail.messageId, status }
      : null;
  } catch {
    return null;
  }
}

// Simulador: el emulador no publica los eventos de SES. Se retira cuando AWS lo arregle.
// Por destinatario: "bounce@..." rebota, "unopened@..." solo se entrega, el resto se entrega y se abre.
export function simulateEvents(to: string, messageId: string): string[] {
  const name = to.split('@')[0];
  const types =
    name === 'bounce' ? ['Bounce'] : name === 'unopened' ? ['Delivery'] : ['Delivery', 'Open'];
  return types.map((eventType) => JSON.stringify({ eventType, mail: { messageId } }));
}
