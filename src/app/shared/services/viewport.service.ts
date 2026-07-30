import { Injectable, inject } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/** Must match the house CSS breakpoint (see CLAUDE.md — 768px everywhere). */
const MOBILE_QUERY = '(max-width: 768px)';

/**
 * TS-side twin of the CSS mobile breakpoint, for the few places where mobile
 * needs different BEHAVIOUR (not just different styling) — e.g. tracker rows
 * switch from inline editing to sheet editing. Prefer plain media queries for
 * anything CSS can express alone.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly breakpoints = inject(BreakpointObserver);

  readonly isMobile = toSignal(
    this.breakpoints.observe(MOBILE_QUERY).pipe(map((s) => s.matches)),
    { initialValue: this.breakpoints.isMatched(MOBILE_QUERY) },
  );
}
