import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { actorId } from '@domain/ids';
import { ApiDailyFleetReportSchema, type FleetReportActor } from '@domain/dispatch';
import type { CodeSession } from '../../../journal/data-access/code-sessions.service';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { environment } from '../../../../../environments/environment';
import { nextDay, fmtDuration, prettySkill, shortRepo, timeRange, titleCase } from './actor-activity.utils';

interface LaneItem {
  label: string;
  meta: string | null;
  // Sustained loops and failures read as "worth a glance", not alarm.
  flagged: boolean;
}

interface Lane {
  id: string;
  label: string;
  summary: string;
  items: LaneItem[];
}

// Per-actor "what happened" swimlanes beside the briefing report — the ground
// truth the report's yesterday_review prose is drawn from. Agents (Boris,
// Kipper) come from the fleet report's job/skill breakdown; Marvin's lane is
// his interactive code sessions (actor === null). Read-only: this is the
// evidence panel, not an authored section, so no hit/miss feedback here.
//
// Follows calendar-board's freshness model implicitly — the day is fixed by
// the briefing, so a resource keyed on it needs no polling.
@Component({
  selector: 'app-actor-activity',
  imports: [EntityChip],
  templateUrl: './actor-activity.html',
  styleUrl: './actor-activity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActorActivity {
  private readonly actors = inject(ActorsService);

  // Logical day the briefing reviews, YYYY-MM-DD (morning → yesterday,
  // afternoon → today), computed by the container from session + generated_at.
  readonly day = input.required<string>();

  private readonly fleetResource = httpResource<unknown>(() => ({
    url: `${environment.dashboardApiUrl}/api/fleet-report/daily`,
    params: { date: this.day() },
  }));

  private readonly sessionsResource = httpResource<{ items: CodeSession[] }>(() => ({
    url: `${environment.dashboardApiUrl}/api/code-sessions`,
    params: { since: `${this.day()}T00:00:00.000Z`, until: `${nextDay(this.day())}T00:00:00.000Z`, limit: 100 },
  }));

  protected readonly loading = computed(() =>
    this.fleetResource.isLoading() || this.sessionsResource.isLoading());

  private readonly fleetActors = computed<FleetReportActor[]>(() => {
    const raw = this.fleetResource.value();
    if (raw === undefined) return [];
    const parsed = ApiDailyFleetReportSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('[actor-activity] fleet-report failed schema:', parsed.error.issues);
      return [];
    }
    return parsed.data.actors;
  });

  // Marvin's interactive work — automated executors' sessions are already
  // covered by the fleet report's job breakdown, so only actor === null here.
  private readonly marvinSessions = computed<CodeSession[]>(() =>
    (this.sessionsResource.value()?.items ?? []).filter(s => s.actor === null));

  protected readonly lanes = computed<Lane[]>(() => {
    const lanes: Lane[] = [];

    const sessions = this.marvinSessions();
    if (sessions.length > 0) lanes.push(this.marvinLane(sessions));

    // Busiest agent first — the day's workhorse leads.
    for (const a of [...this.fleetActors()].sort((x, y) => y.total_jobs - x.total_jobs)) {
      if (a.total_jobs > 0) lanes.push(this.agentLane(a));
    }
    return lanes;
  });

  private marvinLane(sessions: CodeSession[]): Lane {
    const mins = sessions.reduce((n, s) => n + (s.duration_minutes ?? 0), 0);
    const repos = new Set(sessions.map(s => s.repo).filter((r): r is string => !!r)).size;
    const parts = [`${sessions.length} session${sessions.length === 1 ? '' : 's'}`];
    if (mins > 0) parts.push(fmtDuration(mins));
    if (repos > 0) parts.push(`${repos} repo${repos === 1 ? '' : 's'}`);

    return {
      id: 'marvin',
      label: this.actorLabel('marvin'),
      summary: parts.join(' · '),
      items: sessions.map(s => ({
        label: s.headline ?? shortRepo(s.repo) ?? '(untitled session)',
        meta: [s.duration_minutes ? fmtDuration(s.duration_minutes) : null, shortRepo(s.repo)]
          .filter(Boolean).join(' · ') || null,
        flagged: s.friction?.level === 'high',
      })),
    };
  }

  private agentLane(a: FleetReportActor): Lane {
    const parts = [`${a.completed}/${a.total_jobs} done`];
    if (a.failed > 0) parts.push(`${a.failed} failed`);
    if (a.estimated_cost > 0) parts.push(`$${a.estimated_cost.toFixed(2)}`);

    return {
      id: a.executor,
      label: this.actorLabel(a.executor),
      summary: parts.join(' · '),
      items: a.by_skill.map(s => ({
        label: `${prettySkill(s.skill)} ×${s.count}`,
        meta: timeRange(s.first_at, s.last_at),
        flagged: s.sustained_loop,
      })),
    };
  }

  private actorLabel(slug: string): string {
    return this.actors.getById(actorId(slug))?.display_name ?? titleCase(slug);
  }
}
