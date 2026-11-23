import type { Message, Status } from '../api';

// Datos sintéticos y deterministas: sirven para los tests y para la demo.
const NAMES = ['ana', 'luis', 'marta', 'bounce', 'unopened', 'carla', 'diego', 'sofia'];
const SUBJECTS = [
  'Bienvenido',
  'Tu factura de prueba',
  'Restablece tu clave',
  'Novedades de noviembre',
];
const FLOW: Status[][] = [
  ['sent'],
  ['sent', 'delivered'],
  ['sent', 'delivered', 'opened'],
  ['sent', 'bounced'],
];

const seed = (): Message[] =>
  Array.from({ length: 40 }, (_, i) => {
    const sentAt = new Date(Date.UTC(2026, 10, 16, 12) - i * 3_600_000);
    const flow = FLOW[i % FLOW.length];
    return {
      _id: `msg-${String(i + 1).padStart(3, '0')}`,
      to: `${NAMES[i % NAMES.length]}${i}@example.com`,
      subject: SUBJECTS[i % SUBJECTS.length],
      status: flow[flow.length - 1],
      sentAt: sentAt.toISOString(),
      events: flow.slice(1).map((type, j) => ({
        type,
        at: new Date(sentAt.getTime() + (j + 1) * 60_000).toISOString(),
      })),
    };
  });

// Mutable: el POST de la demo añade correos. Los tests lo restablecen tras cada caso.
export const messages: Message[] = seed();
export const resetMessages = () => void messages.splice(0, messages.length, ...seed());

const PATH: Record<string, Status[]> = { bounce: ['bounced'], unopened: ['delivered'] };

// Misma regla que la API: bounce@ rebota, unopened@ solo se entrega, el resto se entrega y se abre.
export function simulateEvents(m: Message) {
  const steps = PATH[m.to.split('@')[0]] ?? ['delivered', 'opened'];
  steps.forEach((type, i) =>
    setTimeout(
      () => {
        m.status = type;
        m.events.push({ type, at: new Date().toISOString() });
      },
      1500 * (i + 1),
    ),
  );
}
