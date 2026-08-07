import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * The interrogate mode catalogue, read from the staleness report.
 *
 * There are 20 modes and no browsable record of them anywhere — the list lives
 * in a skill file on disk, one markdown file per mode, and in an API response
 * that until now emitted only scoring numbers. Keeping track of them meant
 * opening SKILL.md.
 *
 * `depth`, `meta` and the rest are the same registry fields the /interrogate
 * skill's auto-pick filters on, so this page shows exactly what the picker sees.
 */
export type ModeDepth = 'light' | 'medium' | 'deep';

export interface InterrogateMode {
  slug: string;
  name: string;
  frame: string;
  family: string;
  depth: ModeDepth;
  length_minutes: number;
  entities: string[];
  requires_data: 'none' | 'optional' | 'required';
  meta: boolean;
  mode_staleness: number;
  mode_novelty: number;
  contradiction_backlog: number;
  mode_score: number;
  last_run_at: string | null;
  runs_last_30d: number;
}

interface StalenessResponse {
  generated_at: string;
  modes: InterrogateMode[];
}

@Injectable({ providedIn: 'root' })
export class InterrogateModesService {
  private readonly resource = httpResource<StalenessResponse>(
    () => `${environment.dashboardApiUrl}/api/interrogate/staleness`,
  );

  readonly modes = (): InterrogateMode[] => this.resource.value()?.modes ?? [];
  readonly loading = () => this.resource.isLoading();
  readonly error = () => this.resource.error();
}
