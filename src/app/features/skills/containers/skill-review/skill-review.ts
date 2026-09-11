// The keep/tweak/pause decision surface.
//
// `/skills` is the registry: what exists, who may run it, how to edit it.
// This page answers a different question — what is each thing costing, what did
// it actually run on, and is its output wanted — and puts the verdict control
// next to that evidence so the decision can be recorded where it is made.
//
// Deliberately NOT a rebuild of `/hermes`. That page already classifies every
// cron tick into outcome buckets and explains the flat-billing model far better
// than a summary could. The hermes half here is the compact ranking only, with
// a link out for the detail.
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { SkillsService } from '../../data-access/skills.service';
import { AgentRunsService, type JobEffectivenessRow, type JobRatingValue } from '@features/hermes/data-access/agent-runs.service';
import { HermesService } from '@features/hermes/data-access/hermes.service';
import { skillNamespace, skillLocalName, type Skill, type SkillMetadata } from '@domain/skills';

/** One boris skill with everything needed to judge it, joined for the template. */
export interface SkillReviewRow {
  id: string;
  namespace: string | null;
  name: string;
  description: string;
  /** Null when the skill did not run in the window — render as a dash, not £0. */
  cost: number | null;
  /** Null whenever cost or the denominator is missing. */
  costPerRun: number | null;
  /** Null when there is no total to take a share of. */
  sharePct: number | null;
  dispatches: number;
  /** Rejected plus never-approved, as a share of dispatches. Null when none ran. */
  declinedPct: number | null;
  /** Models actually used, commonest first, vendor prefixes stripped. */
  models: string[];
  status: SkillMetadata['status'];
  potential: number | undefined;
  lastRun: string | null;
  /**
   * True for a flow that runs but has no registry entry, so it has no
   * description and no editable verdict. The three grooming stages are the
   * reason this exists: they are the busiest and third-dearest thing running
   * and they live in hub/hermes/skills, invisible to /api/skills.
   */
  unregistered: boolean;
  /** True when a run in the window used a model outside the declared family. */
  mixedModels: boolean;
}

@Component({
  selector: 'app-skill-review',
  imports: [DecimalPipe, RouterLink, UiBadge, UiCluster, UiPage, UiPageHeader, UiStack],
  templateUrl: './skill-review.html',
  styleUrl: './skill-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-testid': 'skill-review' },
})
export class SkillReview {
  private readonly skillsService = inject(SkillsService);
  private readonly agentRuns = inject(AgentRunsService);
  private readonly hermes = inject(HermesService);

  readonly windows = [7, 30, 90] as const;
  readonly days = this.skillsService.economicsDays;
  readonly totalCost = this.skillsService.totalCost;
  readonly pendingStatus = this.skillsService.pendingStatus;
  readonly statusError = this.skillsService.statusError;
  readonly isLoading = this.skillsService.isLoading;
  /**
   * A failed registry load must not render as an empty board.
   *
   * Without this the page says "£417 across 0 skills" when /api/skills 500s —
   * a confident, wrong, and entirely plausible sentence, which is the exact
   * failure the rest of this page is built to avoid. Seen happening: the
   * registry returned 500 while the cost fetch succeeded.
   */
  readonly registryError = this.skillsService.error;

  readonly statuses: readonly NonNullable<SkillMetadata['status']>[] =
    ['keep', 'refine', 'wire-ambient', 'shelve', 'infra'];
  readonly ratings: readonly JobRatingValue[] = ['keep', 'watch', 'cut'];

  private readonly _effectiveness = signal<JobEffectivenessRow[]>([]);
  private readonly _jobRatings = signal<ReadonlyMap<string, JobRatingValue>>(new Map());
  private readonly _showNeverRun = signal(false);

  readonly showNeverRun = this._showNeverRun.asReadonly();

  constructor() {
    this.loadJobs(this.days());
  }

  setWindow(days: number): void {
    this.skillsService.loadEconomics(days);
    this.loadJobs(days);
  }

  toggleNeverRun(): void {
    this._showNeverRun.update(v => !v);
  }

  private loadJobs(days: number): void {
    // Same non-blocking contract the skills page uses: the boris half is the
    // reason to open this page, so a hermes failure empties that section rather
    // than taking the page down with it.
    this.agentRuns.effectiveness(days).subscribe({
      next: r => this._effectiveness.set(r.items),
      error: () => this._effectiveness.set([]),
    });
    this.agentRuns.ratings().subscribe({
      next: r => this._jobRatings.set(new Map(r.items.map(x => [x.job_name, x.rating]))),
      error: () => this._jobRatings.set(new Map()),
    });
  }

  // ── Boris skills ──────────────────────────────────────────────────

  /**
   * Everything that ran in the window, dearest first. Unpriced runs sort last.
   *
   * The union of the registry and the cost data, not just the registry. Five
   * dispatch flows run from `hub/hermes/skills` and are absent from
   * `/api/skills` — including the three grooming stages, which are 1,786 of the
   * window's dispatches and its third-largest line. Ranking only the registry
   * would show a total that the visible rows do not add up to, which is the
   * one thing a spend table must never do.
   */
  readonly ranked = computed<SkillReviewRow[]>(() => {
    // With no registry there is nothing to classify against: every cost row
    // would look unregistered and the board would render a fleet of nameless
    // flows with no verdicts. Empty is the honest answer, and the template
    // says why rather than showing an empty table.
    if (this.registryError()) return [];
    const registered = new Set(this.skillsService.skills().map(s => s.id));
    const rows = this.skillsService.skills()
      .map(s => this.toRow(s))
      .filter(r => r.dispatches > 0);
    for (const e of this.skillsService.economics().values()) {
      if (!registered.has(e.skill_id) && e.dispatches > 0) rows.push(this.toRow(e.skill_id));
    }
    return rows.sort((a, b) => (b.cost ?? -1) - (a.cost ?? -1) || b.dispatches - a.dispatches);
  });

  /**
   * Skills with no dispatch in the window.
   *
   * Collapsed rather than hidden, and never shown as £0 or 0 runs: most carry an
   * `invocation` of `explicit` or `both`, meaning they are slash commands run by
   * hand. `dispatch_queue` cannot see that, so a zero here is an unmeasured zero
   * and is not evidence of anything.
   */
  readonly neverRan = computed<SkillReviewRow[]>(() =>
    this.registryError() ? [] : this.skillsService.skills()
      .map(s => this.toRow(s))
      .filter(r => r.dispatches === 0)
      .sort((a, b) => (b.potential ?? -1) - (a.potential ?? -1) || a.id.localeCompare(b.id)),
  );

  private toRow(subject: Skill | string): SkillReviewRow {
    const unregistered = typeof subject === 'string';
    const s: Skill | null = unregistered ? null : subject;
    const id = unregistered ? subject : subject.id;
    const e = this.skillsService.economics().get(id);
    const total = this.totalCost();
    const cost = e?.cost_usd ?? null;
    const completed = e?.completed ?? 0;
    const dispatches = e?.dispatches ?? 0;
    const models = (e?.models ?? []).map(m => {
      const [model, count] = m.split('×');
      const short = model.split('/').pop()!
        .replace(/^claude-/, '')
        .replace(/-\d{8}$/, '')
        .replace(/-\d+-\d+$/, '')
        .replace(/-\d+$/, '');
      return count ? `${short}×${count}` : short;
    });
    return {
      id,
      namespace: skillNamespace(id),
      name: skillLocalName(id),
      description: s?.description ?? '',
      cost,
      costPerRun: cost !== null && completed ? cost / completed : null,
      sharePct: total && cost !== null ? Math.round(1000 * cost / total) / 10 : null,
      dispatches,
      declinedPct: dispatches ? Math.round(100 * (e?.declined ?? 0) / dispatches) : null,
      models,
      status: s?.metadata.status,
      potential: s?.metadata.potential,
      unregistered,
      lastRun: e?.last_run_at ?? null,
      // Two or more model families in one window. Surfaced because it cannot be
      // seen from frontmatter at all, and because it ran for 16 days before the
      // column existed to show it: 49 Claude-tier dispatches silently landed on
      // deepseek between 2026-08-23 and 2026-09-08, every one recording success.
      mixedModels: models.length > 1,
    };
  }

  setStatus(id: string, value: string): void {
    this.skillsService.setStatus(id, (value || undefined) as SkillMetadata['status']);
  }

  // ── Hermes jobs ───────────────────────────────────────────────────

  /**
   * Jobs that fired in the window, by tokens.
   *
   * Tokens rather than cost: the hermes fleet is flat-billed, so every job's
   * cost is ~£0 by definition and ranking by it would sort noise. Tokens are
   * what a subscription cap actually consumes.
   */
  readonly jobs = computed(() => {
    const enabled = new Map(this.hermes.jobs().map(j => [j.name, j]));
    return this._effectiveness()
      .filter(r => r.fires > 0)
      .map(r => ({
        ...r,
        enabled: enabled.get(r.job_name)?.enabled ?? null,
        rating: this._jobRatings().get(r.job_name) ?? r.rating ?? null,
        silentPct: r.fires ? Math.round(100 * r.silent / r.fires) : null,
      }))
      .sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));
  });

  readonly totalTokens = computed(() =>
    this.jobs().reduce((sum, j) => sum + (j.tokens ?? 0), 0));

  /**
   * How an ask column should read for this job.
   *
   * Three distinct states, three renderings, because they are three different
   * facts (ADR-0037): a job that never asks has no rate to show; a job whose
   * channel we cannot hear has one we cannot know; only the third is a rate.
   */
  askLabel(j: { asked: number; answered: number; answers_attributable: boolean }): string {
    if (!j.asked) return '—';
    if (!j.answers_attributable) return `${j.asked} asked · unobservable`;
    return `${j.answered}/${j.asked}`;
  }

  setRating(jobName: string, value: string): void {
    if (!value) return;
    const rating = value as JobRatingValue;
    this._jobRatings.update(m => new Map(m).set(jobName, rating));
    this.agentRuns.setRating(jobName, rating).subscribe({
      error: () => {
        // Put it back. The page is the record of what was decided, so a verdict
        // that silently failed to save is worse than one that never moved.
        this._jobRatings.update(m => {
          const next = new Map(m);
          next.delete(jobName);
          return next;
        });
      },
    });
  }

  skillLink(id: string): string[] {
    return ['/skills', ...id.split('/')];
  }

  /** Coarse relative time, so the table does not churn while it is read. */
  ago(iso: string | null): string {
    if (!iso) return 'never';
    const ts = Date.parse(iso);
    if (Number.isNaN(ts)) return iso;
    const mins = Math.floor((Date.now() - ts) / 60_000);
    if (mins < 60) return `${Math.max(mins, 0)}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }
}
