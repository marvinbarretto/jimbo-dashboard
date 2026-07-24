// Pure formatting + lane-assembly helpers for the actor-activity swimlanes.
// Extracted for unit testing — the component itself is all resource wiring.
import type { FleetReportActor } from '@domain/dispatch';
import type { CodeSession } from '../../../journal/data-access/code-sessions.service';

export interface LaneItem {
  label: string;
  meta: string | null;
  // Sustained loops and failures read as "worth a glance", not alarm.
  flagged: boolean;
}

export interface Lane {
  id: string;
  label: string;
  summary: string;
  items: LaneItem[];
}

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

/**
 * Assemble the swimlanes: Marvin's interactive sessions first (when any),
 * then agents busiest-first, skipping any with no jobs. `label` resolves a
 * slug to a display name (the component passes the actors service; tests pass
 * a stub) so the assembly stays pure.
 */
export function buildLanes(
  fleetActors: readonly FleetReportActor[],
  marvinSessions: readonly CodeSession[],
  label: (slug: string) => string,
): Lane[] {
  const lanes: Lane[] = [];
  if (marvinSessions.length > 0) lanes.push(marvinLane(marvinSessions, label));

  for (const a of [...fleetActors].sort((x, y) => y.total_jobs - x.total_jobs)) {
    if (a.total_jobs > 0) lanes.push(agentLane(a, label));
  }
  return lanes;
}

function marvinLane(sessions: readonly CodeSession[], label: (slug: string) => string): Lane {
  const mins = sessions.reduce((n, s) => n + (s.duration_minutes ?? 0), 0);
  const repos = new Set(sessions.map(s => s.repo).filter((r): r is string => !!r)).size;
  const parts = [`${sessions.length} session${sessions.length === 1 ? '' : 's'}`];
  if (mins > 0) parts.push(fmtDuration(mins));
  if (repos > 0) parts.push(`${repos} repo${repos === 1 ? '' : 's'}`);

  return {
    id: 'marvin',
    label: label('marvin'),
    summary: parts.join(' · '),
    items: sessions.map(s => ({
      label: s.headline ?? shortRepo(s.repo) ?? '(untitled session)',
      meta: [s.duration_minutes ? fmtDuration(s.duration_minutes) : null, shortRepo(s.repo)]
        .filter(Boolean).join(' · ') || null,
      flagged: s.friction?.level === 'high',
    })),
  };
}

function agentLane(a: FleetReportActor, label: (slug: string) => string): Lane {
  const parts = [`${a.completed}/${a.total_jobs} done`];
  if (a.failed > 0) parts.push(`${a.failed} failed`);
  if (a.estimated_cost > 0) parts.push(`$${a.estimated_cost.toFixed(2)}`);

  return {
    id: a.executor,
    label: label(a.executor),
    summary: parts.join(' · '),
    items: a.by_skill.map(s => ({
      label: `${prettySkill(s.skill)} ×${s.count}`,
      meta: timeRange(s.first_at, s.last_at),
      flagged: s.sustained_loop,
    })),
  };
}
