import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';

export interface ExecutionConfigValue {
  // null = never auto-clear the Done lane (today's default).
  done_lane_auto_clear_days: number | null;
}

@Injectable({ providedIn: 'root' })
export class ExecutionConfigService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // The server always returns a value (defaults when unset — see
  // jimbo-api/src/routes/execution.ts) so this never needs a 404 fallback.
  readonly config = toSignal(
    this.http
      .get<{ value: ExecutionConfigValue }>(`${this.base}/api/execution/config`)
      .pipe(map(r => r.value)),
  );

  saveConfig(value: ExecutionConfigValue): Observable<unknown> {
    return this.http.put(`${this.base}/api/execution/config`, { value });
  }
}
