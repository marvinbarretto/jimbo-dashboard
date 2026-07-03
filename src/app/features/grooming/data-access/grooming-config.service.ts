import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';

export type GroomingAssessmentExecutor = 'jimbo' | 'marvin' | 'ralph' | 'boris';

export interface GroomingConfigValue {
  github_assessment_executor: GroomingAssessmentExecutor;
  github_assessment_skill: string;
}

@Injectable({ providedIn: 'root' })
export class GroomingConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // The server always returns a value (defaults when unset — see
  // jimbo-api/src/routes/grooming.ts) so this never needs a 404 fallback.
  readonly config = toSignal(
    this.http
      .get<{ value: GroomingConfigValue }>(`${this.base}/api/grooming/config`)
      .pipe(map(r => r.value)),
  );

  saveConfig(value: GroomingConfigValue): Observable<unknown> {
    return this.http.put(`${this.base}/api/grooming/config`, { value });
  }
}
