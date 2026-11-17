import { useState, type FormEvent } from 'react';
import { sendEmail } from './api';

const EMPTY = { to: '', subject: '', body: '' };

export default function SendForm({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const { messageId } = await sendEmail(email);
      setEmail(EMPTY);
      setResult({ ok: true, text: `Correo enviado (${messageId}).` });
      onSent();
    } catch (err) {
      // El formulario conserva lo escrito para poder reintentar.
      setResult({ ok: false, text: (err as Error).message });
    } finally {
      setSending(false);
    }
  };

  const set = (patch: Partial<typeof EMPTY>) => setEmail((v) => ({ ...v, ...patch }));

  return (
    <details className="send">
      <summary>Enviar un correo</summary>
      <form aria-label="Enviar correo" onSubmit={submit}>
        <label>
          Para
          <input
            type="email"
            required
            maxLength={254}
            value={email.to}
            onChange={(e) => set({ to: e.target.value })}
            placeholder="ana@example.com"
          />
        </label>
        <label>
          Asunto
          <input
            required
            maxLength={200}
            value={email.subject}
            onChange={(e) => set({ subject: e.target.value })}
          />
        </label>
        <label>
          Mensaje
          <textarea
            required
            rows={3}
            maxLength={10000}
            value={email.body}
            onChange={(e) => set({ body: e.target.value })}
          />
        </label>
        <p className="hint">
          Prueba: <code>bounce@…</code> rebota, <code>unopened@…</code> no se abre.
        </p>
        <button type="submit" disabled={sending}>
          {sending ? 'Enviando…' : 'Enviar'}
        </button>
        {result && (
          <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'ok' : 'error'}>
            {result.text}
          </p>
        )}
      </form>
    </details>
  );
}
