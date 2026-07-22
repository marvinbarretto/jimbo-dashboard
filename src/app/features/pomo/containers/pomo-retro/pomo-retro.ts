import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { CheckinsService } from '../../../checkins/data-access/checkins.service';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiDonutChart } from '@shared/components/ui-donut-chart/ui-donut-chart';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import { UiScorePicker } from '@shared/components/ui-score-picker/ui-score-picker';
import { VaultChip, type VaultChipKind, type VaultChipCreator } from '@shared/components/vault-chip/vault-chip';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import type { SessionMood } from '@domain/focus-sessions';
import type { VaultItem } from '@domain/vault';
import { MOOD_LABELS, ENERGY_LABELS } from '@domain/checkins';
import { environment } from '../../../../../environments/environment';
import { vaultItemId } from '@domain/ids';

interface LinkedItemVM {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly kind: VaultChipKind;
  readonly creator: VaultChipCreator;
  readonly alreadyDone: boolean;
}

interface YoutubeWatchVM {
  readonly title: string;
  readonly channel: string;
  readonly seconds: number;
  readonly url: string;
}

// Flattened from device_events (collector='github', type='push') — pushed
// commits polled from GitHub's events feed, not a session-scoped API resource.
interface CommitVM {
  readonly id: string;
  readonly commit_sha: string;
  readonly message: string;
  readonly repo: string | null;
  readonly branch: string | null;
}

const MOOD_OPTIONS: { value: SessionMood; icon: string; label: string }[] = [
  { value: -1, icon: '👎', label: 'Bad' },
  { value:  0, icon: '😐', label: 'OK' },
  { value:  1, icon: '👍', label: 'Good' },
];

@Component({
  selector: 'app-pomo-retro',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, UiPage, UiStack, UiCard, UiButton, UiCluster, UiStatCard, UiEmptyState, UiDonutChart, UiProgressMeter, UiScorePicker, VaultChip],
  templateUrl: './pomo-retro.html',
  styleUrl: './pomo-retro.scss',
})
export class PomoRetro implements OnInit {
  private readonly sessions = inject(FocusSessionsService);
  private readonly projects = inject(ProjectsService);
  private readonly vaultItems = inject(VaultItemsService);
  private readonly checkins = inject(CheckinsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  // Clicking a vault-chip pushes ?detail=<seq>; this opens the item detail modal.
  constructor() {
    withVaultDetailModal();
  }

  readonly moodOptions = MOOD_OPTIONS;

  // Break duration passed through by the extension (?break=5).
  readonly breakMins = computed(() => {
    const raw = this.route.snapshot.queryParamMap.get('break');
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 5;
  });

  readonly session = computed(() => this.sessions.recent()[0] ?? null);

  readonly projectName = computed(() => {
    const id = this.session()?.project_id;
    if (!id) return 'No project';
    return this.projects.getById(id)?.display_name ?? id;
  });

  readonly plannedMins = computed(() =>
    Math.round((this.session()?.planned_seconds ?? 0) / 60),
  );

  readonly actualMins = computed(() =>
    Math.round((this.session()?.actual_seconds ?? 0) / 60),
  );

  // The story / sub-task this pomo was for (the intention contract), and the
  // YouTube watched during the session window — loaded in ngOnInit.
  readonly linkedItems = signal<LinkedItemVM[]>([]);
  readonly youtube = signal<YoutubeWatchVM[]>([]);
  readonly youtubeMins = computed(() =>
    Math.round(this.youtube().reduce((s, v) => s + v.seconds, 0) / 60),
  );

  readonly activity = computed(() => this.session()?.activity ?? null);

  // Extra activity facets we have but didn't surface before.
  readonly distinctDomains = computed(() => this.activity()?.distinct_domains ?? 0);
  readonly unfocusedLabel = computed(() => {
    const s = this.activity()?.unfocused_seconds ?? 0;
    return s < 60 ? '<1m' : `${Math.round(s / 60)}m`;
  });

  readonly focusPct = computed(() =>
    Math.round((this.activity()?.focus_ratio ?? 0) * 100),
  );

  readonly focusTopMins = computed(() =>
    Math.round((this.activity()?.top_domain_seconds ?? 0) / 60),
  );

  readonly switchesLabel = computed(() => String(this.activity()?.tab_switches ?? 0));

  readonly idleLabel = computed(() => {
    const s = this.activity()?.idle_seconds ?? 0;
    return s < 60 ? '<1m' : `${Math.round(s / 60)}m`;
  });

  readonly topDomainDetail = computed(() => this.activity()?.top_domain ?? null);

  // Top N domains by seconds for the donut, with everything else collapsed
  // into a single "Other" slice so the legend stays readable.
  readonly breakdownLabels = computed(() => {
    const split = this.splitDomains();
    return split.shown.map(d => d.domain).concat(split.otherSecs > 0 ? ['Other'] : []);
  });

  readonly breakdownValues = computed(() => {
    const split = this.splitDomains();
    return split.shown.map(d => Math.round(d.seconds / 60))
      .concat(split.otherSecs > 0 ? [Math.round(split.otherSecs / 60)] : []);
  });

  private splitDomains(): { shown: Array<{ domain: string; seconds: number }>; otherSecs: number } {
    const breakdown = this.activity()?.domain_breakdown ?? [];
    const TOP_N = 5;
    const shown = breakdown.slice(0, TOP_N);
    const otherSecs = breakdown.slice(TOP_N).reduce((acc, d) => acc + d.seconds, 0);
    return { shown, otherSecs };
  }

  readonly commits = signal<CommitVM[]>([]);

  readonly commitsCount = computed(() => this.commits().length);

  readonly commitsDetail = computed(() => {
    const items = this.commits();
    if (!items.length) return null;
    const repos = new Set(items.map(c => c.repo).filter(Boolean));
    if (repos.size <= 1) return null;
    return `across ${repos.size} repos`;
  });

  // The primary focus item (the linked story / sub-task), resolved to a full item.
  readonly focusItem = computed<VaultItem | null>(() => {
    const first = this.linkedItems()[0];
    if (!first || !first.seq) return null;
    return this.vaultItems.getById(vaultItemId(first.id)) ?? null;
  });

  // "Next steps" — real candidates for the next pomo: sibling sub-tasks, other
  // open tasks in the same epic (incl. GH issues synced as vault items), most
  // recent first. Falls back to the project when there's no epic.
  readonly nextSteps = computed<LinkedItemVM[]>(() => {
    const focus = this.focusItem();
    const projectId = this.session()?.project_id ?? null;
    const focusIds = new Set(this.linkedItems().map(i => i.id));
    const epicId = focus ? this.epicAncestorId(focus) : null;

    return this.vaultItems.activeItems()
      .filter(i => !i.is_epic && i.completed_at == null && !focusIds.has(i.id))
      .filter(i => epicId ? this.epicAncestorId(i) === epicId : i.primary_project_id === projectId)
      .sort(byRecency)
      .slice(0, 8)
      .map(i => this.toItemVM(i));
  });

  readonly newSubtaskTitle = signal('');
  readonly newNextStepTitle = signal('');

  readonly completedItemIds = signal<Set<string>>(new Set());

  readonly notes = signal('');
  readonly tags = signal('');
  readonly mood = signal<SessionMood | null>(null);
  readonly interrupted = signal(false);
  readonly saving = signal(false);

  // Separate from `mood` above (session quality, -1/0/1) — this is "how are
  // you feeling right now", a general 1-5 mood/energy check-in fed into the
  // same unified log Telegram and the dashboard write to.
  readonly checkinMood = signal<number | null>(null);
  readonly checkinEnergy = signal<number | null>(null);
  readonly moodLabels = MOOD_LABELS;
  readonly energyLabels = ENERGY_LABELS;

  async ngOnInit(): Promise<void> {
    await this.sessions.loadRecent(1);
    const s = this.session();
    if (s?.notes) this.notes.set(s.notes);
    if (s?.tags.length) this.tags.set(s.tags.join(' '));
    if (s?.mood != null) this.mood.set(s.mood);
    if (s?.interrupted) this.interrupted.set(s.interrupted);
    if (s) {
      const until = s.ended_at ?? this.nowIso();

      // Commits pushed during the session window (polled from GitHub, may lag
      // up to ~15 min behind a push — see loadCommits).
      this.commits.set(await this.loadCommits(s.started_at, until));

      // The linked story / sub-task (intention), resolved to full items so the
      // shared vault-chip can render them with seq + type.
      const notes = await this.sessions.loadNotes(s.id);
      this.linkedItems.set(notes.map(n => this.resolveLinked(n.vault_note_id, n.title)));

      // YouTube watched within the session window.
      this.youtube.set(await this.loadYoutube(s.started_at, until));
    }
  }

  private nowIso(): string {
    return new Date().toISOString();
  }

  private resolveLinked(id: string, fallbackTitle: string): LinkedItemVM {
    const item = this.vaultItems.getById(vaultItemId(id));
    if (!item) {
      return { id, seq: 0, title: fallbackTitle, kind: 'task', creator: 'human', alreadyDone: false };
    }
    return this.toItemVM(item);
  }

  private toItemVM(item: VaultItem): LinkedItemVM {
    const parent = item.parent_id ? this.vaultItems.getById(item.parent_id) : undefined;
    const kind: VaultChipKind = item.is_epic ? 'epic' : (parent && !parent.is_epic ? 'subtask' : 'task');
    const creator: VaultChipCreator = item.source?.kind === 'manual' ? 'human' : 'agent';
    return { id: item.id, seq: item.seq, title: item.title, kind, creator, alreadyDone: item.completed_at != null };
  }

  // Walk the parent chain to the owning epic (the focus's epic, or any item's).
  private epicAncestorId(item: VaultItem): string | null {
    let cur: VaultItem | undefined = item;
    let guard = 0;
    while (cur && guard++ < 12) {
      if (cur.is_epic) return cur.id;
      cur = cur.parent_id ? this.vaultItems.getById(cur.parent_id) : undefined;
    }
    return null;
  }

  // The focus was too big / needs another pomo — break it into a sub-task now.
  breakIntoSubtask(): void {
    const title = this.newSubtaskTitle().trim();
    const focus = this.focusItem();
    if (!title || !focus) return;
    this.vaultItems.createOnBoard({
      title,
      type: 'task',
      parent_id: focus.id,
      primary_project_id: this.session()?.project_id ?? null,
    });
    this.newSubtaskTitle.set('');
  }

  // Capture a fresh next step into the focus's epic (or the project).
  captureNextStep(): void {
    const title = this.newNextStepTitle().trim();
    if (!title) return;
    const focus = this.focusItem();
    this.vaultItems.createOnBoard({
      title,
      type: 'task',
      parent_id: focus ? this.epicAncestorId(focus) : null,
      primary_project_id: this.session()?.project_id ?? null,
    });
    this.newNextStepTitle.set('');
  }

  // Commits shipped during the session: pushed commits, not local ones — the
  // old design (a client-side git hook POSTing to a since-dropped
  // focus_session_commits table) never shipped. GitHub pushes are polled
  // server-side every ~15 min and land in device_events (collector='github'),
  // the same source day-page.ts reads for its commit summary.
  //
  // The push event's `ts` is push time (github-events.ts passes ev.created_at),
  // not when the work happened — the common case is pushing right at the end
  // of a pomo, after `sessionEndIso`. So we query pushes over a wide window (up
  // to "now") and instead scope to the session by each commit's own
  // `author_date`, same as day-page.ts's commitsSummary.
  private async loadCommits(sessionStartIso: string, sessionEndIso: string): Promise<CommitVM[]> {
    try {
      const url =
        `${environment.dashboardApiUrl}/api/telemetry/events?collector=github&type=push` +
        `&since=${encodeURIComponent(sessionStartIso)}&until=${encodeURIComponent(this.nowIso())}&limit=200`;
      const res = await firstValueFrom(
        this.http.get<{
          events: Array<{
            id: string;
            source: string | null;
            payload: {
              branch?: string;
              commits?: Array<{ sha: string; subject: string; author_date: string }>;
            } | null;
          }>;
        }>(url),
      );
      const start = new Date(sessionStartIso).getTime();
      const end = new Date(sessionEndIso).getTime();
      return (res.events ?? []).flatMap((e) => {
        const commits = e.payload?.commits ?? [];
        return commits
          .filter((c) => {
            const authored = new Date(c.author_date).getTime();
            return authored >= start && authored <= end;
          })
          .map((c) => ({
            id: `${e.id}:${c.sha}`,
            commit_sha: c.sha,
            message: c.subject,
            repo: e.source,
            branch: e.payload?.branch ?? null,
          }));
      });
    } catch {
      return [];
    }
  }

  private async loadYoutube(sinceIso: string, untilIso: string): Promise<YoutubeWatchVM[]> {
    try {
      const url =
        `${environment.dashboardApiUrl}/api/telemetry/events?collector=youtube&type=watch_session` +
        `&since=${encodeURIComponent(sinceIso)}&until=${encodeURIComponent(untilIso)}&limit=200`;
      const res = await firstValueFrom(
        this.http.get<{ events: Array<{ value: number | null; payload: Record<string, unknown> | null }> }>(url),
      );
      return (res.events ?? []).map((e) => {
        const p = e.payload ?? {};
        return {
          title: (p['title'] as string) || 'YouTube video',
          channel: (p['channel'] as string) || '',
          seconds: e.value ?? 0,
          url: (p['url'] as string) || '',
        };
      });
    } catch {
      return [];
    }
  }

  shortSha(sha: string): string {
    return sha.slice(0, 7);
  }

  commitSubject(message: string): string {
    return message.split('\n')[0] ?? message;
  }

  isMainBranch(branch: string | null): boolean {
    return branch === 'main' || branch === 'master' || !branch;
  }

  toggleMood(value: SessionMood): void {
    this.mood.set(this.mood() === value ? null : value);
  }

  toggleItemDone(id: string): void {
    this.completedItemIds.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  isItemDone(id: string): boolean {
    return this.completedItemIds().has(id);
  }

  private async persistReflection(): Promise<void> {
    const s = this.session();
    if (!s) return;

    for (const id of this.completedItemIds()) {
      this.vaultItems.setCompleted(vaultItemId(id), true, 'Completed during pomo session');
    }

    const tagList = this.tags()
      .split(/[,\s]+/)
      .map(t => t.replace(/^#/, '').trim())
      .filter(Boolean);
    await this.sessions.update(s.id, {
      notes: this.notes().trim() || null,
      tags: tagList,
      mood: this.mood(),
      interrupted: this.interrupted(),
    });

    const checkinMood = this.checkinMood();
    const checkinEnergy = this.checkinEnergy();
    if (checkinMood != null && checkinEnergy != null) {
      // Best-effort — a failed check-in log shouldn't block the session save
      // that already succeeded above.
      firstValueFrom(
        this.checkins.create({
          source: 'pomo_complete',
          mood: checkinMood,
          energy: checkinEnergy,
          context: { session_id: s.id },
        }),
      ).catch(() => {});
    }
  }

  async startBreak(): Promise<void> {
    this.saving.set(true);
    await this.persistReflection();
    void this.router.navigate(['/pomo/break'], { queryParams: { mins: this.breakMins() } });
  }

  async skipBreak(): Promise<void> {
    this.saving.set(true);
    await this.persistReflection();
    void this.router.navigate(['/pomo/pre-session']);
  }

  formatMins(seconds: number): string {
    return `${Math.round(seconds / 60)}m`;
  }
}

// "Most recent worked on" = latest activity, falling back to creation.
function recencyMs(i: VaultItem): number {
  return new Date(i.latest_activity_at ?? i.created_at).getTime();
}
function byRecency(a: VaultItem, b: VaultItem): number {
  return recencyMs(b) - recencyMs(a);
}
