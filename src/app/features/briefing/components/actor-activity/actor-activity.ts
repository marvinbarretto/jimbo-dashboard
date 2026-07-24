import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { actorId } from '@domain/ids';
import { ApiDailyFleetReportSchema, type FleetReportActor } from '@domain/dispatch';
import type { CodeSession } from '../../../journal/data-access/code-sessions.service';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { environment } from '../../../../../environments/environment';
import { nextDay, titleCase, buildLanes, type Lane } from './actor-activity.utils';

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

  protected readonly lanes = computed<Lane[]>(() =>
    buildLanes(this.fleetActors(), this.marvinSessions(), slug => this.actorLabel(slug)));

  private actorLabel(slug: string): string {
    return this.actors.getById(actorId(slug))?.display_name ?? titleCase(slug);
  }
}
