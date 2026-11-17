export const STATUSES = ['sent', 'delivered', 'bounced', 'opened'] as const;
export type Status = (typeof STATUSES)[number];
export type Counts = Record<Status, number>;

export type Message = {
  _id: string;
  to: string;
  subject: string;
  status: Status;
  sentAt: string;
  events: { type: Status; at: string }[];
};

export type Filters = { status: Status | ''; to: string; since: string; until: string };

async function get<T>(path: string, params: Record<string, string> = {}, signal?: AbortSignal) {
  const url = new URL(path, window.location.href);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`La API respondió ${res.status}`);
  return (await res.json()) as T;
}

export const fetchEmails = (f: Filters, signal?: AbortSignal) =>
  get<Message[]>(
    '/emails',
    {
      status: f.status,
      to: f.to.trim(),
      since: f.since,
      until: f.until && `${f.until}T23:59:59.999Z`,
      limit: '100',
    },
    signal,
  );

export const fetchStats = (signal?: AbortSignal) => get<Counts>('/emails/stats', {}, signal);
