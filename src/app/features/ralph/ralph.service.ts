import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

export interface RalphRunRow {
  id: number;
  job: string;
  started_at: string;
  finished_at: string;
  summary: Record<string, unknown>;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class RalphService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly runs = toSignal(
    this.http
      .get<{ items: RalphRunRow[] }>(`${this.base}/api/ralph?limit=100`)
      .pipe(map(r => r.items)),
    { initialValue: [] as RalphRunRow[] },
  );
}
