import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiSelectChip } from '@shared/components/ui-select-chip/ui-select-chip';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import {
  PIPELINE_KEYS,
  PipelineControlService,
  type PipelineKey,
} from '../../data-access/pipeline-control.service';

/**
 * One stage of the pump, in the order work actually flows. The per-tick number
 * is the throttle for that stage — `deepread` at 0 is a switch, not a slow
 * setting, which the template calls out separately.
 */
interface StageLever {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly key: PipelineKey;
  readonly value: () => number;
  /** Entry stages are the only ones the project scope gates. */
  readonly entry: boolean;
}

interface ScalarLever {
  readonly label: string;
  readonly blurb: string;
  readonly key: PipelineKey;
  readonly value: () => number;
  readonly min: number;
}

/** Vault note types that can be admitted to grooming without a project. */
const PROJECTLESS_TYPE_OPTIONS = ['spike', 'task', 'note', 'reference', 'idea'] as const;

@Component({
  selector: 'app-pipeline-control-page',
  imports: [UiBadge, UiButton, UiPage, UiPageHeader, UiSection, UiSelectChip, UiStack, UiToggle],
  templateUrl: './pipeline-control-page.html',
  styleUrl: './pipeline-control-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-testid': 'pipeline-control-page' },
})
export class PipelineControlPage {
  private readonly pipeline = inject(PipelineControlService);
  private readonly projectsService = inject(ProjectsService);

  readonly keys = PIPELINE_KEYS;
  readonly typeOptions = PROJECTLESS_TYPE_OPTIONS;

  readonly isLoading = this.pipeline.isLoading;
  readonly savingKey = this.pipeline.savingKey;
  readonly error = this.pipeline.error;

  readonly enabled = this.pipeline.enabled;
  readonly scope = this.pipeline.scope;
  readonly scopeProjects = this.pipeline.scopeProjects;
  readonly autonomousProjects = this.pipeline.autonomousProjects;
  readonly projectlessTypes = this.pipeline.projectlessTypes;
  readonly deepreadOff = this.pipeline.deepreadOff;
  readonly projectlessExcluded = this.pipeline.projectlessExcluded;
  readonly groomer = this.pipeline.groomer;
  readonly orchestrator = this.pipeline.orchestrator;

  readonly projects = computed(() =>
    [...this.projectsService.activeProjects()].sort((a, b) => a.id.localeCompare(b.id)),
  );

  readonly stages: readonly StageLever[] = [
    {
      id: 'intake',
      label: 'Intake',
      blurb: 'First read of an ungroomed note. Absorbs deep-read’s queue while that stage is off.',
      key: PIPELINE_KEYS.intakePerTick,
      value: this.pipeline.intakePerTick,
      entry: true,
    },
    {
      id: 'deepread',
      label: 'Deep read',
      blurb: 'Follows and reads a note’s source URL. Entry stage, same gates as intake.',
      key: PIPELINE_KEYS.deepreadPerTick,
      value: this.pipeline.deepreadPerTick,
      entry: true,
    },
    {
      id: 'classify',
      label: 'Classify',
      blurb: 'Types and ranks what intake produced.',
      key: PIPELINE_KEYS.classifyPerTick,
      value: this.pipeline.classifyPerTick,
      entry: false,
    },
    {
      id: 'decompose',
      label: 'Decompose',
      blurb: 'Breaks a classified note into work. Needs priority confidence ≥ 0.6.',
      key: PIPELINE_KEYS.decomposePerTick,
      value: this.pipeline.decomposePerTick,
      entry: false,
    },
  ];

  readonly scalars: readonly ScalarLever[] = [
    {
      label: 'Concurrency cap',
      blurb: 'Grooming dispatches allowed in flight at once.',
      key: PIPELINE_KEYS.concurrencyCap,
      value: this.pipeline.concurrencyCap,
      min: 0,
    },
    {
      label: 'Stale after (min)',
      blurb: 'A dispatch idle this long is reaped and retried.',
      key: PIPELINE_KEYS.staleMinutes,
      value: this.pipeline.staleMinutes,
      min: 1,
    },
    {
      label: 'Max retries',
      blurb: 'Attempts before a note is left alone as exhausted.',
      key: PIPELINE_KEYS.maxRetries,
      value: this.pipeline.maxRetries,
      min: 0,
    },
  ];

  /** Total items the pump can admit per tick — the honest headline number. */
  readonly entryThroughput = computed(
    () => this.pipeline.intakePerTick() + this.pipeline.deepreadPerTick(),
  );

  isSaving(key: PipelineKey): boolean {
    return this.savingKey() === key;
  }

  onToggleEnabled(next: boolean): void {
    void this.pipeline.save(PIPELINE_KEYS.enabled, next);
  }

  onSetScope(next: 'all' | 'priority_1_only'): void {
    void this.pipeline.save(PIPELINE_KEYS.scope, next);
  }

  onStep(key: PipelineKey, current: number, delta: number, min = 0): void {
    const next = Math.max(min, current + delta);
    if (next === current) return;
    void this.pipeline.save(key, next);
  }

  onToggleProject(key: PipelineKey, id: string): void {
    void this.pipeline.toggleInArray(key, id);
  }

  onRefresh(): void {
    void this.pipeline.load();
  }
}
