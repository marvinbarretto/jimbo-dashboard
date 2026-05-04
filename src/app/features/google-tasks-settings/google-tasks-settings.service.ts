import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

export interface GoogleTaskListEntry {
  id: string;
  title: string;
  updated: string;
}

export interface TaskListItemConfig {
  enabled: boolean;
  tag: string | null;
}

export interface GoogleTasksConfigValue {
  lists: Record<string, TaskListItemConfig>;
}

@Injectable({ providedIn: 'root' })
export class GoogleTasksSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly lists = toSignal(
    this.http
      .get<{ lists: GoogleTaskListEntry[]; count: number }>(`${this.base}/api/google-tasks/lists`)
      .pipe(map(r => r.lists)),
  );

  readonly config = toSignal(
    this.http
      .get<{ value: GoogleTasksConfigValue }>(`${this.base}/api/google-tasks/config`)
      .pipe(
        map(r => r.value),
        catchError(err =>
          err.status === 404 ? of({ lists: {} } as GoogleTasksConfigValue) : throwError(() => err),
        ),
      ),
  );

  saveConfig(value: GoogleTasksConfigValue): Observable<unknown> {
    return this.http.put(`${this.base}/api/google-tasks/config`, { value });
  }
}
