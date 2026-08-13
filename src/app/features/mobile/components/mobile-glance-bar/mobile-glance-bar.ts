import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The home screen's top strip: where the day stands, in one line.
 *
 * Deliberately has no outputs and contains no interactive elements — it answers
 * "where am I in the day" and nothing else. Every value arrives pre-formatted
 * from buildGlance() so the formatting rules stay unit-testable; this component
 * only decides where the strings sit.
 */
@Component({
  selector: 'app-mobile-glance-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-glance-bar.html',
  styleUrl: './mobile-glance-bar.scss',
  host: { 'data-testid': 'mobile-glance-bar' },
})
export class MobileGlanceBar {
  readonly dateLabel = input.required<string>();
  readonly statsLabel = input.required<string>();
  readonly nextLabel = input.required<string>();
  /** Spoken equivalent — the visual shorthand reads as gibberish aloud. */
  readonly srSummary = input.required<string>();
}
