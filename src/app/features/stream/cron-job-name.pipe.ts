import { Pipe, PipeTransform, inject } from '@angular/core';
import { CronJobsService } from './cron-jobs.service';

// `pure: false` because the underlying lookup map (CronJobsService.byId)
// is a signal that updates after async fetch — a pure pipe locks in the
// "no match" answer at first render and never re-evaluates. The map is
// small (a few dozen entries) and lookups are O(1), so the perf cost is
// trivial even with frequent change detection.
@Pipe({ name: 'cronJobName', pure: false })
export class CronJobNamePipe implements PipeTransform {
  private readonly service = inject(CronJobsService);

  /**
   * Resolve a session_id to its cron job display name. Returns the
   * supplied fallback (default: empty string) when the id can't be
   * parsed or the job list hasn't loaded yet.
   */
  transform(sessionId: string | null | undefined, fallback = ''): string {
    const job = this.service.jobForSessionId(sessionId);
    return job?.name ?? fallback;
  }
}
