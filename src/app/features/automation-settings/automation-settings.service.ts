import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

export type AutomationExecutor = 'jimbo' | 'marvin' | 'ralph' | 'boris';

export interface AutomationConfigValue {
  github_assessment_executor: AutomationExecutor;
  github_assessment_skill: string;
  // null = never auto-clear the execution board's Done lane (today's behavior).
  done_lane_auto_clear_days: number | null;
}

@Injectable({ providedIn: 'root' })
export class AutomationSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // The server always returns a value (defaults when unset — see
  // jimbo-api/src/routes/automation.ts) so this never needs a 404 fallback.
  readonly config = toSignal(
    this.http
      .get<{ value: AutomationConfigValue }>(`${this.base}/api/automation/config`)
      .pipe(map(r => r.value)),
  );

  saveConfig(value: AutomationConfigValue): Observable<unknown> {
    return this.http.put(`${this.base}/api/automation/config`, { value });
  }
}
