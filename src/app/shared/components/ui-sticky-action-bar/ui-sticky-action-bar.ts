import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ui-sticky-action-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-sticky-action-bar__spacer" aria-hidden="true"></div>
    <div class="ui-sticky-action-bar">
      <div class="ui-sticky-action-bar__lead">
        <ng-content select="[uiStickyActionBarPrimary]" />
      </div>
      <div class="ui-sticky-action-bar__trail" role="group">
        <ng-content select="[uiStickyActionBarSecondary]" />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .ui-sticky-action-bar__spacer {
      height: 56px;
    }

    .ui-sticky-action-bar {
      position: sticky;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.65rem 0.75rem;
      background: color-mix(in srgb, var(--color-bg) 92%, transparent);
      border-top: 1px solid var(--color-border);
      backdrop-filter: blur(14px);
      z-index: 10;
    }

    .ui-sticky-action-bar__lead {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .ui-sticky-action-bar__trail {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 0.45rem;
    }

    @media (max-width: 768px) {
      .ui-sticky-action-bar {
        flex-direction: column;
        align-items: stretch;
      }

      .ui-sticky-action-bar__lead,
      .ui-sticky-action-bar__trail {
        width: 100%;
        justify-content: stretch;
      }
    }
  `],
})
export class UiStickyActionBar {}
