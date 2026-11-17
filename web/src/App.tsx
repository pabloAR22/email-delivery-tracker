import { useEffect, useState } from 'react';
import {
  STATUSES,
  fetchEmails,
  fetchStats,
  type Counts,
  type Filters,
  type Message,
  type Status,
} from './api';

const LABEL: Record<Status, string> = {
  sent: 'Enviado',
  delivered: 'Entregado',
  bounced: 'Rebotado',
  opened: 'Abierto',
};
const REFRESH_MS = 5000;
const EMPTY: Filters = { status: '', to: '', since: '', until: '' };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function App() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const debounced = useDebounced(filters, 300);
  const [rows, setRows] = useState<Message[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const [emails, stats] = await Promise.all([
          fetchEmails(debounced, ctrl.signal),
          fetchStats(ctrl.signal),
        ]);
        setRows(emails);
        setCounts(stats);
        setError(null);
      } catch (e) {
        if (!ctrl.signal.aborted) setError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [debounced, retry]);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = Object.values(filters).some(Boolean);

  return (
    <main>
      <h1>Email delivery tracker</h1>
      <p className="sub">Qué pasó con cada correo: enviado, entregado, rebotado o abierto.</p>

      <section aria-label="Resumen por estado" className="cards">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`card ${s}`}
            aria-pressed={filters.status === s}
            onClick={() => set({ status: filters.status === s ? '' : s })}
          >
            <span className="n">{counts ? counts[s] : '–'}</span>
            <span>{LABEL[s]}</span>
          </button>
        ))}
      </section>

      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label>
          Destinatario
          <input
            type="search"
            value={filters.to}
            onChange={(e) => set({ to: e.target.value })}
            placeholder="ana@…"
          />
        </label>
        <label>
          Estado
          <select
            value={filters.status}
            onChange={(e) => set({ status: e.target.value as Filters['status'] })}
          >
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input type="date" value={filters.since} onChange={(e) => set({ since: e.target.value })} />
        </label>
        <label>
          Hasta
          <input type="date" value={filters.until} onChange={(e) => set({ until: e.target.value })} />
        </label>
        <button type="button" disabled={!filtered} onClick={() => setFilters(EMPTY)}>
          Limpiar
        </button>
      </form>

      {error && (
        <div role="alert" className="error">
          No se pudo cargar: {error}{' '}
          <button onClick={() => setRetry((n) => n + 1)}>Reintentar</button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <caption className="sr-only">Correos enviados, del más reciente al más antiguo</caption>
          <thead>
            <tr>
              <th>Destinatario</th>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Enviado</th>
              <th>Último evento</th>
            </tr>
          </thead>
          <tbody>
            {rows?.map((m) => (
              <tr key={m._id}>
                <td>{m.to}</td>
                <td>{m.subject}</td>
                <td>
                  <span className={`badge ${m.status}`}>{LABEL[m.status]}</span>
                </td>
                <td>{fmt(m.sentAt)}</td>
                <td>{m.events.length ? fmt(m.events[m.events.length - 1].at) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows === null && !error && <p className="empty">Cargando…</p>}
        {rows?.length === 0 && (
          <p className="empty">
            {filtered ? 'Ningún correo coincide con los filtros.' : 'Todavía no hay correos.'}
          </p>
        )}
      </div>
      <p className="foot">Se actualiza cada {REFRESH_MS / 1000} s · máximo 100 resultados</p>
    </main>
  );
}
