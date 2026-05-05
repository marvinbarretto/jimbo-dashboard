import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  updated: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class TriageTasksService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly tasks = signal<GoogleTask[] | undefined>(undefined);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<{ tasks: GoogleTask[]; count: number }>(`${this.base}/api/google-tasks/tasks`)
      .subscribe({
        next: r => {
          this.tasks.set(r.tasks);
          this.loading.set(false);
        },
        error: e => {
          const msg = e?.error?.message ?? e?.message ?? 'Failed to load tasks';
          this.error.set(msg);
          this.loading.set(false);
          console.error('[TriageTasks] load error', e);
        },
      });
  }
}
