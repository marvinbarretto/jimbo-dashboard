import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { WatchQueueService } from '../../data-access/watch-queue.service';

/**
 * The watch queue, as a plain list.
 *
 * Read-only on purpose. url-triage produces this; ranking it and finding time
 * for it are separate jobs. Nothing here writes to the calendar — the previous
 * version of that idea booked nine evening slots in one go and was immediately
 * unusable.
 *
 * Shows raw runtime AND runtime at 1.5x, because the second number is the one
 * that decides whether something fits the gap you actually have.
 */
@Component({
  selector: 'app-watch-queue-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './watch-queue-panel.scss',
  template: `
    <section class="watchq">
      <div class="watchq__head">
        <span>Watch queue</span>
        <span class="watchq__count">{{ svc.count() }}</span>
      </div>

      @if (svc.isLoading()) {
        <div class="watchq__note">Loading…</div>
      } @else if (svc.hasError()) {
        <div class="watchq__note watchq__note--error">Couldn't load the watch queue.</div>
      } @else if (svc.count() === 0) {
        <div class="watchq__note">Nothing queued.</div>
      } @else {
        <div class="watchq__sub">
          {{ fmt(svc.totalWatchMinutes()) }} at 1.5&times;
          <span class="watchq__raw">({{ fmt(svc.totalMinutes()) }} actual)</span>
        </div>

        <ul class="watchq__list">
          @for (item of items(); track item.id) {
            <li class="watchq__item">
              <div class="watchq__row">
                <span class="watchq__len" [class.watchq__len--long]="(item.watchMinutes ?? 0) >= 40">
                  {{ item.watchMinutes ?? '?' }}m
                </span>
                @if (item.url) {
                  <a class="watchq__title" [href]="item.url" target="_blank" rel="noopener">{{ item.title }}</a>
                } @else {
                  <span class="watchq__title">{{ item.title }}</span>
                }
              </div>
              <div class="watchq__meta">
                @if (item.seq) { <span class="watchq__seq">#{{ item.seq }}</span> }
                @if (item.minutes && item.minutes !== item.watchMinutes) {
                  <span class="watchq__actual">{{ item.minutes }}m actual</span>
                }
                @if (item.blocks) { <span class="watchq__blocks">{{ item.blocks }}&times;25m</span> }
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class WatchQueuePanel implements OnInit {
  protected readonly svc = inject(WatchQueueService);

  /** Shortest first — matches how you'd actually pick something to watch. */
  protected readonly items = computed(() => this.svc.byShortest());

  ngOnInit(): void {
    void this.svc.load();
  }

  protected fmt(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
}
