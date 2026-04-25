import { Directive, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// Lightweight replacement for [routerLink] on a kanban card's title anchor.
//
// Plain left-click → push `?detail=<seq>` (board's withVaultDetailModal opens
// the dialog). Modifier-keys / middle-click / right-click → fall through to
// the browser, which honours the rendered href and opens the full-page route
// in a new tab. Keeps `<a>` semantics intact (a11y, "open in new tab", copy
// link address) while giving plain clicks the in-context modal behaviour.
@Directive({
  selector: 'a[appKanbanCardLink]',
  host: {
    '[attr.href]': 'href()',
    '(click)': 'onClick($event)',
  },
})
export class KanbanCardLinkDirective {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly appKanbanCardLink = input.required<number>();

  readonly href = () => `/vault-items/${this.appKanbanCardLink()}`;

  onClick(event: MouseEvent): void {
    // Anything but a plain primary-button click — let the browser handle it.
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: this.appKanbanCardLink() },
      queryParamsHandling: 'merge',
      // Push a history entry so the browser back button closes the modal.
      replaceUrl: false,
    });
  }
}
