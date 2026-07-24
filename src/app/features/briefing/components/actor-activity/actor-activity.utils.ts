// Pure formatting helpers for the actor-activity swimlanes. Extracted for
// unit testing — the component itself is all resource wiring.

/** Next calendar day (UTC) for a YYYY-MM-DD string — the code-session window's upper bound. */
export function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Minutes → compact human duration: '45min', '1h', '2h 5min'. */
export function fmtDuration(mins: number): string {
  if (mins < 60) return `${Math.round(mins)}min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** 'triage/email-triage' → 'email triage'; keeps the flow-level noise out. */
export function prettySkill(skill: string | null): string {
  if (!skill) return 'work';
  return (skill.split('/').at(-1) ?? skill).replace(/-/g, ' ');
}

/** 'marvinbarretto/jimbo-dashboard' → 'jimbo-dashboard'. */
export function shortRepo(repo: string | null): string | null {
  return repo ? (repo.split('/').at(-1) ?? repo) : null;
}

export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** 'HH:mm' for a single instant, or 'HH:mm–HH:mm' when first and last differ. */
export function timeRange(first: string | null, last: string | null): string | null {
  if (!first) return null;
  const f = hhmm(first);
  const l = last ? hhmm(last) : null;
  return l && l !== f ? `${f}–${l}` : f;
}
