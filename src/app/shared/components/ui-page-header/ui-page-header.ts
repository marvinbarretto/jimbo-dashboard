import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-ui-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="ui-page-header">
      <div class="ui-page-header__main">
        <ng-content select="[uiPageHeaderLead]" />
        <div class="ui-page-header__copy">
          <ng-content select="[uiPageHeaderTitle]" />
          <ng-content select="[uiPageHeaderHint]" />
        </div>
      </div>
      <div class="ui-page-header__actions">
        <ng-content select="[uiPageHeaderActions]" />
      </div>
    </header>
  `,
  styles: [`
    .ui-page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      min-width: 0;
      padding-bottom: 0.25rem;
    }

    .ui-page-header__main {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.45rem;
      min-width: 0;
    }

    .ui-page-header__copy {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
    }

    .ui-page-header__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    :host ::ng-deep [uiPageHeaderTitle] {
      margin: 0;
      min-width: 0;
    }

    :host ::ng-deep [uiPageHeaderHint] {
      margin: 0;
      color: var(--color-text-soft);
      font-size: 0.92rem;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .ui-page-header {
        flex-direction: column;
      }

      .ui-page-header__actions {
        width: 100%;
        justify-content: flex-start;
      }
    }
  `],
})
export class UiPageHeader {}
