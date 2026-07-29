import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { BehaviorSubject, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { withVaultDetailModal } from './detail-modal';

class FakeDialogRef {
  private readonly closedSubject = new Subject<void>();
  readonly closed = this.closedSubject.asObservable();
  closeCalls = 0;
  close(): void {
    this.closeCalls++;
    this.closedSubject.next();
    this.closedSubject.complete();
  }
}

class FakeDialog {
  readonly opened: FakeDialogRef[] = [];
  open(): FakeDialogRef {
    const ref = new FakeDialogRef();
    this.opened.push(ref);
    return ref;
  }
}

function fakeParamMap(params: Record<string, string>) {
  return { get: (key: string) => params[key] ?? null };
}

@Component({ template: '' })
class HostComponent {
  constructor() { withVaultDetailModal(); }
}

describe('withVaultDetailModal', () => {
  let fixture: ComponentFixture<HostComponent>;
  let dialog: FakeDialog;
  let queryParamMap$: BehaviorSubject<ReturnType<typeof fakeParamMap>>;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    queryParamMap$ = new BehaviorSubject(fakeParamMap({}));

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: Dialog, useClass: FakeDialog },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: queryParamMap$ },
        },
      ],
      imports: [HostComponent],
    });
    dialog = TestBed.inject(Dialog) as unknown as FakeDialog;
    const router = TestBed.inject(Router);
    navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('opens a dialog when ?detail= is present', () => {
    queryParamMap$.next(fakeParamMap({ detail: '42' }));
    fixture.detectChanges();
    expect(dialog.opened.length).toBe(1);
  });

  it('closes the dialog when the query param clears', () => {
    queryParamMap$.next(fakeParamMap({ detail: '42' }));
    fixture.detectChanges();
    const ref = dialog.opened[0];

    queryParamMap$.next(fakeParamMap({}));
    fixture.detectChanges();

    expect(ref.closeCalls).toBe(1);
  });

  it('navigates to clear the URL when the dialog is closed from inside (not via URL)', () => {
    queryParamMap$.next(fakeParamMap({ detail: '42' }));
    fixture.detectChanges();
    const ref = dialog.opened[0];

    ref.close();

    expect(navigateSpy).toHaveBeenCalledWith([], expect.objectContaining({
      queryParams: { detail: null, note: null },
    }));
  });

  // The actual bug: CDK Dialog attaches to <body>, outside the router-outlet
  // tree. If the host is destroyed while a dialog is open (operator
  // navigates away without closing it), the effect never runs its close
  // branch — before this fix, the dialog + backdrop stayed visibly stuck on
  // screen after the underlying page was torn down.
  it('closes the dialog when the host component is destroyed while it is open', () => {
    queryParamMap$.next(fakeParamMap({ detail: '42' }));
    fixture.detectChanges();
    const ref = dialog.opened[0];
    expect(ref.closeCalls).toBe(0);

    fixture.destroy();

    expect(ref.closeCalls).toBe(1);
  });

  it('does not redundantly navigate when the destroy-triggered close fires', () => {
    queryParamMap$.next(fakeParamMap({ detail: '42' }));
    fixture.detectChanges();
    navigateSpy.mockClear();

    fixture.destroy();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('does nothing on destroy when no dialog was ever open', () => {
    expect(() => fixture.destroy()).not.toThrow();
    expect(dialog.opened.length).toBe(0);
  });
});
