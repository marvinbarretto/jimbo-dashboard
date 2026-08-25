import type { NotificationEntry } from '@shared/components/notification-bar/notification-bar';
import type { NotificationTone } from '@shared/components/notification-bar/notification-item';
import type { FleetFailure } from './fleet-stats.api-schema';

const BRIEFING_PREFIX = 'briefing-';

// Mirrors pipeline.max_retries' server-side default (pipeline-pump.ts
// DEFAULTS.maxRetries). This is a display heuristic, not the enforcement
// point — it's read live nowhere on this page — so if the setting is ever
// tuned away from 2, grading just drifts a notch soft/hard until this is
// updated to match, it doesn't change what the pump actually does.
const DEFAULT_MAX_RETRIES = 2;

// A note still under the retry cap is expected pipeline noise (the reaper
// doing its job); one that's reached the cap is stuck and won't clear itself
// without a human, which is the distinction worth a harder color.
function tone(f: FleetFailure): NotificationTone {
  return f.retry_count >= DEFAULT_MAX_RETRIES ? 'danger' : 'warning';
}

// Short caps label for the notification bar. Briefing dispatches get a
// readable session name (they're the one flow with a fixed, known-good task_id
// per session); everything else falls back to flow, since the fleet spans many
// skills and there's no single naming scheme to lean on.
function sourceLabel(f: FleetFailure): string {
  if (f.task_id.startsWith(BRIEFING_PREFIX)) {
    const session = f.task_id.slice(BRIEFING_PREFIX.length);
    return `Briefing · ${session}`;
  }
  if (f.flow === 'groom') return 'Grooming';
  return f.skill ?? f.flow;
}

function message(f: FleetFailure): string {
  const reason = f.error_message ?? 'Dispatch failed';
  return f.note_title ? `${f.note_title} — ${reason}` : reason;
}

// Briefing failures never got an analysis row, so there's no /briefing/:id to
// deep-link — send those to the archive instead. Everything else points at
// the fleet board, where the full failure detail (retry count, executor,
// skill) already lives.
function href(f: FleetFailure): string {
  return f.task_id.startsWith(BRIEFING_PREFIX) ? '/briefings' : '/fleet';
}

/**
 * Fleet-wide dispatch failure → one notification-bar entry. `count` lets a
 * caller collapse repeat failures on the same underlying note (retries) into
 * one row — the entry keeps the most recent failure's id, so dismissing it
 * is still a valid dispatch id to acknowledge.
 */
export function failureToNotification(f: FleetFailure, count = 1): NotificationEntry {
  return {
    id: f.id,
    source: sourceLabel(f),
    message: message(f),
    timestamp: f.completed_at,
    tone: tone(f),
    href: href(f),
    count,
  };
}
