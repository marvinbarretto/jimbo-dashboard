import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { FocusSessionsService } from '../../data-access/focus-sessions.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import type { FocusSession } from '@domain/focus-sessions';

const PRESETS = [15, 25, 45, 90] as const;

@Component({
  selector: 'app-pomo-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiPageHeader,
    UiStack,
    UiCard,
    UiCluster,
    UiButton,
    UiSubhead,
  ],
  templateUrl: './pomo-page.html',
  styleUrl: './pomo-page.scss',
})
export class PomoPage {
  private readonly sessions = inject(FocusSessionsService);
  private readonly projects = inject(ProjectsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly active = this.sessions.active;
  readonly recent = this.sessions.recent;
  readonly activeProjects = this.projects.activeProjects;

  readonly presets = PRESETS;

  // Setup form for the idle state. minutes is required and is updated by the
  // preset buttons or typed manually — same control either way.
  readonly setupForm = this.fb.nonNullable.group({
    project_id: [''],
    minutes:    [25, [Validators.required, Validators.min(1), Validators.max(480)]],
  });

  // Capture form for when the timer expires (or finishes early).
  readonly captureForm = this.fb.nonNullable.group({
    notes: [''],
    tags:  [''],
  });

  // Wall-clock-sourced "now" — recomputing remaining seconds from started_at
  // every tick avoids OnPush + setInterval drift.
  private readonly now = signal(Date.now());

  readonly remainingSeconds = computed(() => {
    const s = this.active();
    if (!s) return 0;
    const elapsed = (this.now() - new Date(s.started_at).getTime()) / 1000;
    return Math.max(0, Math.round(s.planned_seconds - elapsed));
  });

  readonly progressPct = computed(() => {
    const s = this.active();
    if (!s) return 0;
    const remaining = this.remainingSeconds();
    return Math.min(100, Math.max(0, ((s.planned_seconds - remaining) / s.planned_seconds) * 100));
  });

  readonly displayTime = computed(() => formatTime(this.remainingSeconds()));
  readonly isExpired = computed(() => this.active() !== null && this.remainingSeconds() === 0);

  constructor() {
    this.sessions.loadActive();
    this.sessions.loadRecent();

    // Tick only while a session is active.
    effect((onCleanup) => {
      if (!this.active()) return;
      const handle = setInterval(() => this.now.set(Date.now()), 1000);
      onCleanup(() => clearInterval(handle));
    });

    // Refresh from server when the tab regains focus — cheap way to pick up
    // a session ended on another device without a websocket.
    if (typeof document !== 'undefined') {
      const onVisible = () => {
        if (document.visibilityState === 'visible') this.sessions.loadActive();
      };
      document.addEventListener('visibilitychange', onVisible);
      this.destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
    }

    // Keep the tab title alive with the countdown — useful on mobile when
    // the page is backgrounded but the OS still shows it in the switcher.
    effect(() => {
      if (this.active()) {
        document.title = `${this.displayTime()} — Pomo`;
      } else if (typeof document !== 'undefined' && document.title.includes('— Pomo')) {
        document.title = 'Pomo';
      }
    });
  }

  selectPreset(min: number): void {
    this.setupForm.controls.minutes.setValue(min);
  }

  isPreset(min: number): boolean {
    return this.setupForm.controls.minutes.value === min;
  }

  start(): void {
    if (this.setupForm.invalid) {
      this.setupForm.markAllAsTouched();
      return;
    }
    const v = this.setupForm.getRawValue();
    this.sessions.start({
      project_id: v.project_id || null,
      planned_seconds: Math.round(v.minutes * 60),
    });
    this.captureForm.reset({ notes: '', tags: '' });
  }

  complete(): void {
    const s = this.active();
    if (!s) return;
    const v = this.captureForm.getRawValue();
    this.sessions.complete(s.id, {
      notes: v.notes.trim() || undefined,
      tags: parseTags(v.tags),
    });
    this.captureForm.reset({ notes: '', tags: '' });
  }

  abandon(): void {
    const s = this.active();
    if (!s) return;
    if (!confirm('Abandon this session?')) return;
    this.sessions.abandon(s.id);
  }

  trackById(_i: number, s: FocusSession): string {
    return s.id;
  }

  projectName(id: string | null): string {
    if (!id) return 'Unassigned';
    return this.projects.getById(id)?.display_name ?? id;
  }

}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function parseTags(raw: string): string[] | undefined {
  const parts = raw
    .split(/[,\s]+/)
    .map(t => t.replace(/^#/, '').trim())
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)) : undefined;
}
