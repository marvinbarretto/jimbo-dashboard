import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

// Candidate sizing tiers for the identity-chip family (entity/tag/actor/vault/job
// chip). Static mockups, not the real components — a decision aid before any
// rollout. Buttons are real so hover/focus-visible/click work in the browser;
// "visited" has no literal browser meaning for a <button>, so it's mocked here
// as an "opened before" seen-state using the same dashed/muted grammar as paused.

type Tier = 'baseline' | 'chunky-m' | 'chunky-l';

@Component({
  selector: 'app-chip-sizing-options-section',
  imports: [UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Chip Sizing — Options" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__support-copy">
          Candidates for a bigger, chunkier identity chip — the family behind
          <code>app-entity-chip</code>, <code>app-tag-chip</code>, <code>app-actor-chip</code>,
          <code>app-vault-chip</code>, and <code>app-job-chip</code>. All currently sit around
          0.7rem font / 0.15rem vertical padding. Tab through, hover, and click to compare —
          nothing here wires back to the real components yet. Pick a tier and we'll roll it into
          the shared chip styles.
        </p>

        @for (tier of tiers; track tier.key) {
          <div>
            <p class="ui-lab__subhead">{{ tier.label }} <span class="chip-demo__tokens">{{ tier.tokens }}</span></p>
            <div class="chip-demo__row">
              <div class="chip-demo__cell">
                <button type="button" [class]="'chip-demo chip-demo--' + tier.key">Default</button>
                <span class="chip-demo__caption">default</span>
              </div>
              <div class="chip-demo__cell">
                <button type="button" [class]="'chip-demo chip-demo--' + tier.key">Hover me</button>
                <span class="chip-demo__caption">hover</span>
              </div>
              <div class="chip-demo__cell">
                <button type="button" [class]="'chip-demo chip-demo--' + tier.key">Tab to me</button>
                <span class="chip-demo__caption">focus-visible</span>
              </div>
              <div class="chip-demo__cell">
                <button
                  type="button"
                  [class]="'chip-demo chip-demo--' + tier.key + (isSelected(tier.key) ? ' chip-demo--selected' : '')"
                  (click)="toggle(tier.key)">
                  {{ isSelected(tier.key) ? 'Selected' : 'Click to select' }}
                </button>
                <span class="chip-demo__caption">active / selected</span>
              </div>
              <div class="chip-demo__cell">
                <button type="button" [class]="'chip-demo chip-demo--' + tier.key + ' chip-demo--paused'">Paused</button>
                <span class="chip-demo__caption">paused / muted</span>
              </div>
              <div class="chip-demo__cell">
                <button type="button" [class]="'chip-demo chip-demo--' + tier.key + ' chip-demo--visited'">Opened</button>
                <span class="chip-demo__caption">visited (seen before)</span>
              </div>
              <div class="chip-demo__cell">
                <button type="button" [class]="'chip-demo chip-demo--' + tier.key + ' chip-demo--danger'">Failing</button>
                <span class="chip-demo__caption">danger / failing</span>
              </div>
            </div>
          </div>
        }
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .chip-demo__tokens {
      font-size: 0.7rem;
      font-weight: 400;
      color: var(--color-text-muted);
      margin-left: 0.5rem;
    }

    .chip-demo__row {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
    }

    .chip-demo__cell {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
    }

    .chip-demo__caption {
      font-size: 0.65rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Shared shape */
    .chip-demo {
      font: inherit;
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      white-space: nowrap;
      transition: border-color 0.12s, color 0.12s, background 0.12s, box-shadow 0.12s, transform 0.12s;
    }

    /* --- Baseline (today) --- */
    .chip-demo--baseline {
      font-size: 0.7rem;
      padding: 0.15rem 0.55rem;
      border: 1px solid var(--color-border);
    }
    .chip-demo--baseline:hover { border-color: var(--color-text-muted); color: var(--color-text); }
    .chip-demo--baseline:focus-visible { outline: 1px solid var(--color-accent); outline-offset: 1px; }
    .chip-demo--baseline.chip-demo--selected { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-bg); }
    .chip-demo--baseline.chip-demo--paused { border-style: dashed; color: var(--color-text-soft); }
    .chip-demo--baseline.chip-demo--visited { color: var(--color-text-soft); }
    .chip-demo--baseline.chip-demo--danger { border-color: var(--color-danger); color: var(--color-danger); }

    /* --- Chunky Medium --- */
    .chip-demo--chunky-m {
      font-size: 0.8125rem;
      padding: 0.4rem 0.85rem;
      border: 1.5px solid var(--color-border);
      font-weight: 500;
    }
    .chip-demo--chunky-m:hover {
      border-color: var(--color-text-muted);
      background: color-mix(in srgb, var(--color-text) 4%, var(--color-surface));
    }
    .chip-demo--chunky-m:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }
    .chip-demo--chunky-m.chip-demo--selected {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-bg);
      font-weight: 600;
    }
    .chip-demo--chunky-m.chip-demo--paused {
      border-style: dashed;
      color: var(--color-text-soft);
      background: transparent;
    }
    .chip-demo--chunky-m.chip-demo--visited {
      color: var(--color-text-soft);
      background: color-mix(in srgb, var(--color-text) 3%, var(--color-surface));
    }
    .chip-demo--chunky-m.chip-demo--danger {
      border-color: var(--color-danger);
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
    }

    /* --- Chunky Large --- */
    .chip-demo--chunky-l {
      font-size: 0.9rem;
      padding: 0.55rem 1.1rem;
      border: 2px solid var(--color-border);
      font-weight: 500;
    }
    .chip-demo--chunky-l:hover {
      border-color: var(--color-text-muted);
      background: color-mix(in srgb, var(--color-text) 5%, var(--color-surface));
      transform: translateY(-1px);
      box-shadow: 0 2px 6px color-mix(in srgb, var(--color-text) 12%, transparent);
    }
    .chip-demo--chunky-l:focus-visible {
      outline: 3px solid var(--color-accent);
      outline-offset: 2px;
    }
    .chip-demo--chunky-l.chip-demo--selected {
      background: var(--color-accent);
      border-color: var(--color-accent);
      color: var(--color-bg);
      font-weight: 600;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--color-accent) 35%, transparent);
    }
    .chip-demo--chunky-l.chip-demo--paused {
      border-style: dashed;
      color: var(--color-text-soft);
      background: transparent;
    }
    .chip-demo--chunky-l.chip-demo--visited {
      color: var(--color-text-soft);
      background: color-mix(in srgb, var(--color-text) 3%, var(--color-surface));
    }
    .chip-demo--chunky-l.chip-demo--danger {
      border-color: var(--color-danger);
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 10%, var(--color-surface));
    }
  `],
})
export class ChipSizingOptionsSection {
  protected readonly tiers: ReadonlyArray<{ key: Tier; label: string; tokens: string }> = [
    { key: 'baseline',  label: 'Baseline (today)',   tokens: '0.7rem · 0.15/0.55rem · 1px border' },
    { key: 'chunky-m',  label: 'Chunky — Medium',     tokens: '0.8125rem · 0.4/0.85rem · 1.5px border · 2px focus ring' },
    { key: 'chunky-l',  label: 'Chunky — Large',      tokens: '0.9rem · 0.55/1.1rem · 2px border · 3px focus ring' },
  ];

  private readonly selectedTier = signal<Tier | null>(null);

  protected isSelected(tier: Tier): boolean {
    return this.selectedTier() === tier;
  }

  protected toggle(tier: Tier): void {
    this.selectedTier.update(current => (current === tier ? null : tier));
  }
}
